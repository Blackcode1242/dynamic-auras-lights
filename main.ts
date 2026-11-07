import OBR from "@owlbear-rodeo/sdk";
import type { Image } from "@owlbear-rodeo/sdk";
import "./style.css";
import {
  AURA_KEY, BLEND_MODES, EDITOR_ID, GROUP_LABELS, PRESETS,
  getAura, isToken, loadDraft, normalizeConfig, saveDraft
} from "./shared";
import type { AuraConfig, BlendModeName, Group, Placement, Preset, Shape } from "./shared";

let selected: Image[] = [];
let active = false;
let draft: AuraConfig = loadDraft();
let lastEdit = 0;
let writeTimer: number | undefined;

function presetOptions() {
  return (Object.keys(GROUP_LABELS) as Group[]).map((group) => {
    const options = (Object.entries(PRESETS) as [Preset, (typeof PRESETS)[Preset]][])
      .filter(([, p]) => p.group === group)
      .map(([key, p]) => `<option value="${key}">${p.label}</option>`)
      .join("");
    return `<optgroup label="${GROUP_LABELS[group]}">${options}</optgroup>`;
  }).join("");
}

function render() {
  const app = document.querySelector<HTMLDivElement>("#app")!;
  app.innerHTML = `
    <main>
      <header>
        <div class="topline">
          <div class="eyebrow">OWLBEAR RODEO · EXTENSION</div>
          <button id="close" class="icon-btn" title="Fechar painel">✕</button>
        </div>
        <h1>Dynamic Auras <span>& Lights</span></h1>
      </header>

      <section id="empty" class="panel">
        <p class="empty-title">Nenhum token selecionado</p>
        <p class="hint">Selecione um token no mapa. Para ligar a aura direto nele, clique com o botão direito e escolha <b>Ativar aura</b>.</p>
      </section>

      <section id="editor" class="panel" hidden>
        <div class="sel" id="selInfo"></div>
        <label class="switch">
          <input id="active" type="checkbox" />
          <span class="track"></span>
          <span class="switch-text">Aura ativa</span>
        </label>

        <label for="preset">Efeito</label>
        <select id="preset">${presetOptions()}</select>

        <div class="row">
          <div class="field grow">
            <label for="color">Cor</label>
            <input id="color" type="color" />
          </div>
          <div class="field grow">
            <label for="radius">Raio (quadrados)</label>
            <input id="radius" type="number" min="0.5" max="20" step="0.5" />
          </div>
        </div>
        <div class="row">
          <div class="field grow">
            <label for="shape">Formato</label>
            <select id="shape">
              <option value="circle">Círculo</option>
              <option value="square">Quadrado</option>
            </select>
          </div>
          <div class="field grow">
            <label for="placement">Posição</label>
            <select id="placement">
              <option value="below">Abaixo do token</option>
              <option value="above">Acima do token</option>
            </select>
          </div>
        </div>
        <label for="blend">Modo de mistura</label>
        <select id="blend">
          ${BLEND_MODES.map((m) => `<option value="${m.value}">${m.label}</option>`).join("")}
        </select>
        <label for="softness">Suavidade da borda <output id="softnessValue"></output></label>
        <input id="softness" type="range" min="0" max="1" step="0.01" />
        <label for="intensity">Intensidade <output id="intensityValue"></output></label>
        <input id="intensity" type="range" min="0.1" max="1.5" step="0.01" />
        <label for="speed">Velocidade <output id="speedValue"></output></label>
        <input id="speed" type="range" min="0" max="8" step="0.1" />
        <p id="status" class="status" hidden></p>
      </section>

      <footer>Versão 1.2 · as mudanças valem na hora</footer>
    </main>
  `;

  const $ = <T extends HTMLElement>(sel: string) => app.querySelector<T>(sel)!;
  const emptyEl = $<HTMLElement>("#empty");
  const editorEl = $<HTMLElement>("#editor");
  const selInfo = $<HTMLElement>("#selInfo");
  const activeEl = $<HTMLInputElement>("#active");
  const presetEl = $<HTMLSelectElement>("#preset");
  const colorEl = $<HTMLInputElement>("#color");
  const radiusEl = $<HTMLInputElement>("#radius");
  const shapeEl = $<HTMLSelectElement>("#shape");
  const placementEl = $<HTMLSelectElement>("#placement");
  const blendEl = $<HTMLSelectElement>("#blend");
  const softnessEl = $<HTMLInputElement>("#softness");
  const intensityEl = $<HTMLInputElement>("#intensity");
  const speedEl = $<HTMLInputElement>("#speed");
  const softnessValue = $<HTMLOutputElement>("#softnessValue");
  const intensityValue = $<HTMLOutputElement>("#intensityValue");
  const speedValue = $<HTMLOutputElement>("#speedValue");
  const statusEl = $<HTMLElement>("#status");
  const closeEl = $<HTMLButtonElement>("#close");

  closeEl.addEventListener("click", () => {
    OBR.popover.close(EDITOR_ID).catch(() => {});
    OBR.action.close().catch(() => {});
  });

  function showStatus(message: string) {
    statusEl.textContent = message;
    statusEl.hidden = !message;
  }

  function updateOutputs() {
    softnessValue.value = `${Math.round(Number(softnessEl.value) * 100)}%`;
    intensityValue.value = `${Math.round(Number(intensityEl.value) * 100)}%`;
    speedValue.value = speedEl.value;
  }

  function writeUi(cfg: AuraConfig) {
    presetEl.value = cfg.preset;
    colorEl.value = cfg.color;
    radiusEl.value = String(cfg.radius);
    shapeEl.value = cfg.shape;
    placementEl.value = cfg.placement;
    blendEl.value = cfg.blendMode;
    softnessEl.value = String(cfg.softness);
    intensityEl.value = String(cfg.intensity);
    speedEl.value = String(cfg.speed);
    updateOutputs();
  }

  function readUi(): AuraConfig {
    return normalizeConfig({
      preset: presetEl.value as Preset,
      color: colorEl.value,
      radius: Number(radiusEl.value),
      shape: shapeEl.value as Shape,
      placement: placementEl.value as Placement,
      blendMode: blendEl.value as BlendModeName,
      softness: Number(softnessEl.value),
      intensity: Number(intensityEl.value),
      speed: Number(speedEl.value)
    });
  }

  function updateView(syncControls: boolean) {
    const has = selected.length > 0;
    emptyEl.hidden = has;
    editorEl.hidden = !has;
    if (!has) return;
    selInfo.textContent = selected.length === 1
      ? (selected[0].name || "Token sem nome")
      : `${selected.length} tokens selecionados`;
    activeEl.checked = active;
    if (syncControls) writeUi(draft);
  }

  async function writeAura(config: AuraConfig) {
    if (!selected.length) return;
    try {
      await OBR.scene.items.updateItems(selected, (items) => {
        for (const item of items) item.metadata[AURA_KEY] = { ...config };
      });
      showStatus("");
    } catch (error) {
      console.error(error);
      showStatus("Não foi possível salvar.");
    }
  }

  async function removeAura() {
    if (!selected.length) return;
    try {
      await OBR.scene.items.updateItems(selected, (items) => {
        for (const item of items) delete item.metadata[AURA_KEY];
      });
      showStatus("");
    } catch (error) {
      console.error(error);
      showStatus("Não foi possível remover.");
    }
  }

  async function refresh(force: boolean) {
    try {
      if (!(await OBR.scene.isReady())) {
        selected = [];
        active = false;
        updateView(true);
        return;
      }
      const ids = await OBR.player.getSelection();
      const items = ids?.length ? await OBR.scene.items.getItems(ids) : [];
      selected = items.filter(isToken);
      const source = selected.find((token) => getAura(token));
      active = Boolean(source);
      const idle = Date.now() - lastEdit > 700;
      if (source && (force || idle)) draft = normalizeConfig(getAura(source));
      updateView(force || idle);
    } catch (error) {
      console.error(error);
    }
  }

  function commit() {
    lastEdit = Date.now();
    saveDraft(draft);
    if (!active) return;
    window.clearTimeout(writeTimer);
    writeTimer = window.setTimeout(() => { writeAura(draft); }, 40);
  }

  function onEdit() {
    draft = readUi();
    updateOutputs();
    commit();
  }

  function onPreset() {
    const preset = PRESETS[presetEl.value as Preset];
    draft = {
      ...readUi(),
      color: preset.color,
      intensity: preset.intensity,
      speed: preset.speed,
      softness: preset.softness
    };
    writeUi(draft);
    commit();
  }

  for (const el of [colorEl, radiusEl, softnessEl, intensityEl, speedEl]) el.addEventListener("input", onEdit);
  for (const el of [shapeEl, placementEl, blendEl]) el.addEventListener("change", onEdit);
  presetEl.addEventListener("change", onPreset);

  activeEl.addEventListener("change", async () => {
    lastEdit = Date.now();
    if (activeEl.checked) {
      active = true;
      draft = readUi();
      saveDraft(draft);
      await writeAura(draft);
    } else {
      active = false;
      await removeAura();
    }
  });

  OBR.player.onChange(() => {
    refresh(true);
  });

  OBR.scene.items.onChange(() => {
    refresh(false);
  });

  OBR.scene.onReadyChange(() => {
    refresh(true);
  });

  writeUi(draft);
  refresh(true);
}

// Só monta o painel (e só fala com a API do Owlbear) DEPOIS que o SDK estiver pronto.
OBR.onReady(() => {
  document.body.classList.add("obr-ready");
  render();
});
