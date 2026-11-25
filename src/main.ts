import OBR, { isImage, isShape } from "@owlbear-rodeo/sdk";
import type { Image } from "@owlbear-rodeo/sdk";
import "./style.css";
import {
  AURA_KEY, BLEND_MODES, DIRECTIONS, EDITOR_ID, GROUP_LABELS, PRESETS,
  deletePreset, exportPresets, getAura, getSettings, hideDrawing, importPresets, isArea, isAuraTarget,
  isHidden, loadDraft, loadSavedPresets, normalizeConfig, readSharedSelection, readStatus, saveDraft,
  savePreset, SEL_KEY, setSettings, showDrawing, VERSION
} from "./shared";
import {
  MAX_RUNS, SPECIALS, SPECIAL_IDS, SPECIAL_RUNS_KEY, loadSpecialDraft, makeRun, normalizeSpecial, pruneRuns,
  readRuns, saveSpecialDraft, snapshotGeometry
} from "./special";
import type { SpecialConfig, SpecialId } from "./special";
import type { Area, AuraConfig, BlendModeName, Direction, Group, Placement, Preset, PresetDef, Quality, Schedule, Shape } from "./shared";

let selected: (Image | Area)[] = [];
let active = false;
let draft: AuraConfig = loadDraft();
let lastEdit = 0;
let manualIds: string[] = [];
let lastKey = "";
let pickerKey = "";
let writeTimer: number | undefined;

// Ordem do seletor de direção: grade 3x3 com o centro vazio.
const DIRECTION_PAD: (Direction | null)[] = ["upLeft", "up", "upRight", "left", null, "right", "downLeft", "down", "downRight"];

function directionPad() {
  return DIRECTION_PAD.map((id) => {
    if (!id) return `<span class="dir-center" aria-hidden="true"></span>`;
    const d = DIRECTIONS.find((x) => x.id === id)!;
    return `<button type="button" class="dir-btn" data-dir="${d.id}" title="${d.label}" aria-label="${d.label}" aria-pressed="false">${d.arrow}</button>`;
  }).join("");
}

function presetOptions() {
  return (Object.keys(GROUP_LABELS) as Group[]).map((group) => {
    const options = (Object.entries(PRESETS) as [Preset, (typeof PRESETS)[Preset]][])
      .filter(([, p]) => p.group === group)
      .map(([key, p]) => `<option value="${key}">${p.label}</option>`)
      .join("");
    return `<optgroup label="${GROUP_LABELS[group]}">${options}</optgroup>`;
  }).join("");
}

function specialOptions() {
  const group = (kind: "event" | "phenomenon", label: string) => {
    const options = SPECIAL_IDS.filter((id) => SPECIALS[id].group === kind)
      .map((id) => `<option value="${id}">${SPECIALS[id].label}</option>`).join("");
    return `<optgroup label="${label}">${options}</optgroup>`;
  };
  return group("event", "Acontecimentos") + group("phenomenon", "Fenômenos");
}

function render() {
  const app = document.querySelector<HTMLDivElement>("#app")!;
  app.innerHTML = `
    <main>
      <header>
        <h1>Dynamic <span>Auras & Lights</span></h1>
        <div class="header-right">
          <label class="switch" title="Ativar ou desativar aura">
            <input id="active" type="checkbox" />
            <span class="track"></span>
            <span class="switch-text">Ativo</span>
          </label>
          <button id="close" class="icon-btn" title="Fechar painel">✕</button>
        </div>
      </header>

      <section id="empty" class="panel">
        <p class="empty-title">Nenhum token selecionado</p>
        <p class="hint">Selecione um token ou um desenho no mapa para configurar suas auras e luzes.</p>
        <label for="pick">Ou escolha pela lista</label>
        <select id="pick"><option value="">— escolher —</option></select>
      </section>

      <section id="editor" class="panel" hidden>
        <div class="sel" id="selInfo"></div>

        <nav class="editor-tabs" aria-label="Categorias de configuração">
          <button type="button" class="tab-button is-active" data-tab="effect">Efeitos</button>
          <button type="button" class="tab-button" data-tab="advanced">Avançado</button>
          <button type="button" class="tab-button" data-tab="special">Especiais</button>
        </nav>

        <div class="config-layout">
          <section class="config-section" data-tab-panel="effect">
            <div class="section-heading"><h2>Efeito</h2></div>
            <div class="section-content">
              <div><label for="preset">Efeito / Preset</label><select id="preset">${presetOptions()}</select></div>
              <div class="row">
                <div class="grow"><label for="color">Cor principal</label><input id="color" type="color" /></div>
                <div class="grow"><label for="radius" id="radiusLabel">Raio</label><input id="radius" type="number" min="0.5" max="20" step="0.5" /></div>
              </div>
            </div>
          </section>

          <section class="config-section" data-tab-panel="effect">
            <div class="section-heading"><h2>Gradiente</h2></div>
            <div class="section-content">
              <div class="row align-center">
                <div class="grow"><label class="switch"><input id="gradientEnabled" type="checkbox" /><span class="track"></span><span class="switch-text">Ativar gradiente</span></label></div>
                <div class="grow"><label for="gradientMode">Tipo</label><select id="gradientMode"><option value="linear">Linear</option><option value="radial">Radial</option></select></div>
              </div>
              <div class="row">
                <div class="grow"><label for="gradientColor">Cor final / borda</label><input id="gradientColor" type="color" /></div>
                <div class="grow" id="gradientMiddleColorField"><label for="gradientColor2">Cor intermediária</label><input id="gradientColor2" type="color" /></div>
              </div>
              <div class="row" id="gradientStop2Field"><div class="grow"><label for="gradientStop2">Posição da cor intermediária <output id="gradientStop2Value"></output></label><input id="gradientStop2" type="range" min="5" max="95" step="1" /></div></div>
              <div id="gradientAngleRow"><label for="gradientAngle">Direção do gradiente <output id="gradientAngleValue"></output></label><input id="gradientAngle" type="range" min="0" max="360" step="5" /></div>
            </div>
          </section>

          <section class="config-section" data-tab-panel="advanced">
            <div class="section-heading"><h2>Geometria</h2></div>
            <div class="section-content">
              <div class="row">
                <div class="grow" id="shapeField"><label for="shape">Formato</label><select id="shape"><option value="circle">Círculo</option><option value="square" id="shapeSquare">Quadrado</option><option value="cone">Cone</option><option value="line">Linha</option></select></div>
                <div class="grow"><label for="placement">Posição</label><select id="placement"><option value="below">Abaixo</option><option value="above">Acima</option></select></div>
              </div>
              <div id="coneRow"><label for="angle">Abertura do cone <output id="angleValue"></output></label><input id="angle" type="range" min="10" max="170" step="1" /></div>
              <div id="lineRow"><label for="width">Largura da linha</label><input id="width" type="number" min="0.1" max="10" step="0.1" /></div>
              <div id="dirRow">
                <label>Direção <output id="directionValue"></output></label>
                <div class="dir-pad" id="dirPad" role="group" aria-label="Direção do cone ou da linha">${directionPad()}</div>
              </div>
            </div>
          </section>

          <section class="config-section" data-tab-panel="advanced">
            <div class="section-heading"><h2>Ajustes visuais</h2></div>
            <div class="section-content">
              <div><label for="blend">Modo de mistura</label><select id="blend">${BLEND_MODES.map((m) => `<option value="${m.value}">${m.label}</option>`).join("")}</select></div>
              <div><label for="softness">Suavidade <output id="softnessValue"></output></label><input id="softness" type="range" min="0" max="1" step="0.01" /></div>
              <div><label for="intensity">Intensidade <output id="intensityValue"></output></label><input id="intensity" type="range" min="0.1" max="1.5" step="0.01" /></div>
              <div><label for="speed">Velocidade <output id="speedValue"></output></label><input id="speed" type="range" min="0" max="8" step="0.1" /></div>
            </div>
          </section>

          <section class="config-section" data-tab-panel="special">
            <div class="section-heading"><h2>Efeito especial</h2></div>
            <div class="section-content">
              <p class="hint" style="margin:0 0 10px">Acontecimentos que o mestre dispara na hora, em tokens ou desenhos. Todos os jogadores veem.</p>
              <div><label for="spEffect">Efeito</label><select id="spEffect">${specialOptions()}</select><p id="spHint" class="hint" style="margin:6px 0 0"></p></div>
              <div class="row">
                <div class="grow"><label for="spColor">Cor</label><input id="spColor" type="color" /></div>
                <div class="grow"><label for="spRadius" id="spRadiusLabel">Raio</label><input id="spRadius" type="number" min="0" max="30" step="0.5" /></div>
              </div>
              <div><label for="spDuration">Duração da entrada <output id="spDurationValue"></output></label><input id="spDuration" type="range" min="0.5" max="20" step="0.5" /></div>
              <div><label for="spIntensity">Intensidade <output id="spIntensityValue"></output></label><input id="spIntensity" type="range" min="0.2" max="1.6" step="0.05" /></div>
              <div><label for="spSpeed">Velocidade dos movimentos <output id="spSpeedValue"></output></label><input id="spSpeed" type="range" min="0.2" max="4" step="0.1" /></div>
              <div class="row">
                <div class="grow"><label for="spPlacement">Posição</label><select id="spPlacement"><option value="above">Acima</option><option value="below">Abaixo</option></select></div>
                <div class="grow"><label for="spBlend">Mistura</label><select id="spBlend">${BLEND_MODES.map((m) => `<option value="${m.value}">${m.label}</option>`).join("")}</select></div>
              </div>
              <label class="switch"><input id="spPersist" type="checkbox" /><span class="track"></span><span class="switch-text">Permanece até desfazer</span></label>
              <label class="switch"><input id="spTrail" type="checkbox" /><span class="track"></span><span class="switch-text">Deixar rastro residual ao final</span></label>
              <label class="switch" id="spRevealRow"><input id="spReveal" type="checkbox" /><span class="track"></span><span class="switch-text">Revelar token invisível ao final da entrada</span></label>
              <div class="row" style="margin-top:6px">
                <button type="button" id="spFire" class="grow">▶ Disparar</button>
                <button type="button" id="spStop" class="grow">■ Desfazer</button>
              </div>
              <button type="button" id="spClear">Limpar todos os efeitos da cena</button>
              <p id="spStatus" class="status" hidden></p>
            </div>
          </section>
        </div>

        <div id="scheduleRow" class="full-width" data-tab-panel="advanced">
          <label for="schedule">Quando acende (Dynamic Day Cycle)</label>
          <select id="schedule">
            <option value="always">Sempre acesa</option>
            <option value="night">Só à noite</option>
            <option value="day">Só de dia</option>
          </select>
        </div>

        <details class="mine full-width" data-tab-panel="advanced">
          <summary>Meus presets salvos</summary>
          <select id="mine"><option value="">— meus presets —</option></select>
          <div class="btnrow" style="margin-top:6px;">
            <button id="mineApply" type="button">Aplicar</button>
            <button id="mineDelete" type="button">Apagar</button>
          </div>
          <input id="mineName" type="text" maxlength="40" placeholder="Nome do preset" />
          <div class="btnrow">
            <button id="mineSave" type="button">Salvar atual</button>
            <button id="mineIO" type="button">Exportar/Importar</button>
          </div>
          <div id="ioBox" hidden>
            <textarea id="mineText" rows="4" spellcheck="false"></textarea>
            <button id="mineImport" type="button">Importar texto</button>
          </div>
        </details>

        <label class="switch" id="hideRow" hidden style="margin-top: 4px;">
          <input id="hide" type="checkbox" />
          <span class="track"></span>
          <span class="switch-text">Esconder o desenho (opacidade 0)</span>
        </label>
        <p id="status" class="status" hidden></p>
      </section>

      <section class="panel" style="padding: 10px 14px;">
        <details class="mine">
          <summary>Desempenho e Ajustes</summary>
          <div class="row" style="margin-top: 8px;">
            <div class="grow">
              <label for="quality">Qualidade</label>
              <select id="quality">
                <option value="high">Alta (todos)</option>
                <option value="medium">Média (simples)</option>
                <option value="low">Baixa (brilho simples)</option>
              </select>
            </div>
          </div>
        </details>
      </section>

      <details class="diag panel" style="padding: 10px 14px;">
        <summary>Diagnóstico</summary>
        <pre id="diagText"></pre>
      </details>
      <footer>Dynamic Auras & Lights v${VERSION}</footer>
    </main>
  `;

  const $ = <T extends HTMLElement>(sel: string) => app.querySelector<T>(sel)!;
  const emptyEl = $<HTMLElement>("#empty");
  const editorEl = $<HTMLElement>("#editor");
  const selInfo = $<HTMLElement>("#selInfo");
  const activeEl = $<HTMLInputElement>("#active");
  const presetEl = $<HTMLSelectElement>("#preset");
  const colorEl = $<HTMLInputElement>("#color");
  const gradientEnabledEl = $<HTMLInputElement>("#gradientEnabled");
  const gradientModeEl = $<HTMLSelectElement>("#gradientMode");
  const gradientColorEl = $<HTMLInputElement>("#gradientColor");
  const gradientColor2El = $<HTMLInputElement>("#gradientColor2");
  const gradientStop2El = $<HTMLInputElement>("#gradientStop2");
  const gradientAngleEl = $<HTMLInputElement>("#gradientAngle");
  const gradientAngleValue = $<HTMLOutputElement>("#gradientAngleValue");
  const gradientStop2Value = $<HTMLOutputElement>("#gradientStop2Value");
  const gradientAngleRow = $<HTMLElement>("#gradientAngleRow");
  const gradientMiddleColorField = $<HTMLElement>("#gradientMiddleColorField");
  const gradientStop2Field = $<HTMLElement>("#gradientStop2Field");
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
  const radiusLabel = $<HTMLElement>("#radiusLabel");
  const hideRow = $<HTMLElement>("#hideRow");
  const hideEl = $<HTMLInputElement>("#hide");
  const pickEl = $<HTMLSelectElement>("#pick");
  const diagEl = $<HTMLElement>("#diagText");
  const closeEl = $<HTMLButtonElement>("#close");
  const coneRow = $<HTMLElement>("#coneRow");
  const lineRow = $<HTMLElement>("#lineRow");
  const dirRow = $<HTMLElement>("#dirRow");
  const angleEl = $<HTMLInputElement>("#angle");
  const widthEl = $<HTMLInputElement>("#width");
  const dirPad = $<HTMLElement>("#dirPad");
  const shapeSquareOption = $<HTMLOptionElement>("#shapeSquare");
  let direction: Direction = draft.direction;
  const scheduleEl = $<HTMLSelectElement>("#schedule");
  const angleValue = $<HTMLOutputElement>("#angleValue");
  const directionValue = $<HTMLOutputElement>("#directionValue");
  const mineEl = $<HTMLSelectElement>("#mine");
  const mineName = $<HTMLInputElement>("#mineName");
  const ioBox = $<HTMLElement>("#ioBox");
  const mineText = $<HTMLTextAreaElement>("#mineText");
  const qualityEl = $<HTMLSelectElement>("#quality");
  const spEffect = $<HTMLSelectElement>("#spEffect");
  const spHint = $<HTMLElement>("#spHint");
  const spColor = $<HTMLInputElement>("#spColor");
  const spRadius = $<HTMLInputElement>("#spRadius");
  const spRadiusLabel = $<HTMLElement>("#spRadiusLabel");
  const spDuration = $<HTMLInputElement>("#spDuration");
  const spDurationValue = $<HTMLOutputElement>("#spDurationValue");
  const spIntensity = $<HTMLInputElement>("#spIntensity");
  const spIntensityValue = $<HTMLOutputElement>("#spIntensityValue");
  const spSpeed = $<HTMLInputElement>("#spSpeed");
  const spSpeedValue = $<HTMLOutputElement>("#spSpeedValue");
  const spPlacement = $<HTMLSelectElement>("#spPlacement");
  const spBlend = $<HTMLSelectElement>("#spBlend");
  const spPersist = $<HTMLInputElement>("#spPersist");
  const spTrail = $<HTMLInputElement>("#spTrail");
  const spReveal = $<HTMLInputElement>("#spReveal");
  const spRevealRow = $<HTMLElement>("#spRevealRow");
  const spFire = $<HTMLButtonElement>("#spFire");
  const spStop = $<HTMLButtonElement>("#spStop");
  const spClear = $<HTMLButtonElement>("#spClear");
  const spStatus = $<HTMLElement>("#spStatus");
  const activeSwitch = app.querySelector<HTMLElement>(".header-right .switch")!;
  let spDraft: SpecialConfig = loadSpecialDraft();

  app.querySelectorAll<HTMLButtonElement>(".tab-button").forEach((button) => {
    button.addEventListener("click", () => {
      const tab = button.dataset.tab;
      app.querySelectorAll<HTMLButtonElement>(".tab-button").forEach((item) => {
        const selectedTab = item === button;
        item.classList.toggle("is-active", selectedTab);
        item.setAttribute("aria-selected", String(selectedTab));
      });
      app.querySelectorAll<HTMLElement>("[data-tab-panel]").forEach((panel) => {
        panel.hidden = panel.dataset.tabPanel !== tab;
      });
      // O interruptor "Ativo" liga a aura contínua; na aba de efeitos especiais ele só confundiria.
      activeSwitch.style.display = tab === "special" ? "none" : "";
    });
  });
  app.querySelector<HTMLButtonElement>('.tab-button[data-tab="effect"]')?.click();

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
    gradientAngleValue.value = `${gradientAngleEl.value}°`;
    gradientStop2Value.value = `${gradientStop2El.value}%`;
    angleValue.value = `${angleEl.value}°`;
    directionValue.value = DIRECTIONS.find((d) => d.id === direction)?.label ?? "";
    dirPad.querySelectorAll<HTMLButtonElement>(".dir-btn").forEach((button) => {
      const on = button.dataset.dir === direction;
      button.classList.toggle("is-active", on);
      button.setAttribute("aria-pressed", String(on));
    });
  }

  function updateRows() {
    const gradientMode = gradientModeEl.value;
    gradientAngleRow.hidden = gradientMode !== "linear";
    gradientMiddleColorField.hidden = gradientMode === "linear";
    gradientStop2Field.hidden = gradientMode === "linear";
    const onlyAreas = selected.length > 0 && selected.every(isArea);
    const shape = shapeEl.value;
    const directional = shape === "cone" || shape === "line";
    coneRow.hidden = shape !== "cone";
    // Em desenhos a largura da linha é a do próprio desenho.
    lineRow.hidden = onlyAreas || shape !== "line";
    dirRow.hidden = !directional;
    // Em desenhos o "quadrado" não existe: o círculo já segue o contorno real.
    shapeSquareOption.hidden = onlyAreas;
    shapeSquareOption.disabled = onlyAreas;
    radiusLabel.textContent = onlyAreas ? (directional ? "Alcance" : "Expansão") : "Raio";
    spRadiusLabel.textContent = onlyAreas ? "Expansão" : "Raio (0 = tamanho da imagem)";
    spRevealRow.hidden = !selected.some((item) => isImage(item));
    radiusEl.min = onlyAreas && !directional ? "0" : "0.5";
  }

  function writeUi(cfg: AuraConfig) {
    presetEl.value = cfg.preset;
    colorEl.value = cfg.color;
    gradientEnabledEl.checked = cfg.gradientEnabled;
    gradientModeEl.value = cfg.gradientMode;
    gradientColorEl.value = cfg.gradientColor;
    gradientColor2El.value = cfg.gradientColor2;
    gradientAngleEl.value = String(cfg.gradientAngle);
    gradientStop2El.value = String(Math.round(cfg.gradientStop2 * 100));
    radiusEl.value = String(cfg.radius);
    const onlyAreas = selected.length > 0 && selected.every(isArea);
    shapeEl.value = onlyAreas && cfg.shape === "square" ? "circle" : cfg.shape;
    placementEl.value = cfg.placement;
    blendEl.value = cfg.blendMode;
    softnessEl.value = String(cfg.softness);
    intensityEl.value = String(cfg.intensity);
    speedEl.value = String(cfg.speed);
    angleEl.value = String(cfg.angle);
    widthEl.value = String(cfg.width);
    direction = cfg.direction;
    scheduleEl.value = cfg.schedule;
    updateOutputs();
    updateRows();
  }

  function readUi(): AuraConfig {
    return normalizeConfig({
      preset: presetEl.value as Preset,
      color: colorEl.value,
      gradientEnabled: gradientEnabledEl.checked,
      gradientMode: gradientModeEl.value as "linear" | "radial",
      gradientColor: gradientColorEl.value,
      gradientColor2: gradientColor2El.value,
      gradientAngle: Number(gradientAngleEl.value),
      gradientStop2: Number(gradientStop2El.value) / 100,
      radius: Number(radiusEl.value),
      shape: shapeEl.value as Shape,
      placement: placementEl.value as Placement,
      blendMode: blendEl.value as BlendModeName,
      softness: Number(softnessEl.value),
      intensity: Number(intensityEl.value),
      speed: Number(speedEl.value),
      angle: Number(angleEl.value),
      width: Number(widthEl.value),
      direction,
      schedule: scheduleEl.value as Schedule
    });
  }

  function updateView(syncControls: boolean) {
    const has = selected.length > 0;
    emptyEl.hidden = has;
    editorEl.hidden = !has;
    if (!has) return;
    selInfo.textContent = selected.length === 1
      ? (selected[0].name || (isArea(selected[0]) ? "Desenho sem nome" : "Token sem nome"))
      : `${selected.length} itens selecionados`;
    const areas = selected.filter(isArea);
    hideRow.hidden = areas.length === 0;
    hideEl.checked = areas.length > 0 && areas.every(isHidden);
    activeEl.checked = active;
    if (syncControls) writeUi(draft);
    else updateRows();
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
        for (const item of items) {
          delete item.metadata[AURA_KEY];
          if (isArea(item)) showDrawing(item);
        }
      });
      showStatus("");
    } catch (error) {
      console.error(error);
      showStatus("Não foi possível remover.");
    }
  }

  function showDiag(d: Record<string, string>) {
    diagEl.textContent = Object.entries(d).map(([k, v]) => `${k}: ${v}`).join("\n");
  }

  async function fillPicker() {
    const all = (await OBR.scene.items.getItems()).filter(isAuraTarget);
    const key = all.map((i) => i.id).join(",");
    if (key === pickerKey) return;
    pickerKey = key;
    pickEl.innerHTML = `<option value="">— escolher —</option>` + all.map((i) => {
      const label = (i.name || (isArea(i) ? "Desenho" : "Token")).replace(/[<>&"]/g, "");
      return `<option value="${i.id}">${label} · ${i.id.slice(0, 4)}</option>`;
    }).join("");
  }

  async function refresh(mode: "force" | "soft" | "poll") {
    const d: Record<string, string> = { versão: VERSION, qualidade: getSettings().quality };
    for (const [k, v] of Object.entries(readStatus())) d[k] = v;
    try {
      const ready = await OBR.scene.isReady();
      d["cena pronta"] = ready ? "sim" : "NÃO";
      if (!ready) {
        selected = [];
        active = false;
        updateView(true);
        showDiag(d);
        return;
      }

      let ids: string[] = [];
      let from = "nenhuma";
      try {
        const sel = await OBR.player.getSelection();
        d["seleção (painel)"] = String(sel?.length ?? 0);
        if (sel?.length) { ids = sel; from = "painel"; }
      } catch (error) {
        d["erro getSelection"] = String(error);
      }
      if (!ids.length) {
        const shared = readSharedSelection();
        d["seleção (fundo)"] = String(shared.length);
        if (shared.length) { ids = shared; from = "fundo"; }
      }
      if (!ids.length && manualIds.length) { ids = manualIds; from = "lista"; }
      d["fonte usada"] = from;

      const key = ids.join(",");
      if (mode === "poll" && key === lastKey) { showDiag(d); return; }
      lastKey = key;

      const items = ids.length ? await OBR.scene.items.getItems(ids) : [];
      d["itens encontrados"] = `${items.length} de ${ids.length}`;
      d["tipo/camada"] = items.map((i) => `${i.type}/${i.layer}`).join(", ") || "-";
      selected = items.filter(isAuraTarget);
      d["alvos válidos"] = String(selected.length);
      const source = selected.find((token) => getAura(token));
      active = Boolean(source);
      const idle = Date.now() - lastEdit > 700;
      const sync = mode === "force" || mode === "poll" || idle;
      if (source && sync) draft = normalizeConfig(getAura(source));
      updateView(sync);
      if (!selected.length) await fillPicker();
    } catch (error) {
      console.error(error);
      d["erro"] = String(error);
    }
    showDiag(d);
  }

  function commit() {
    lastEdit = Date.now();
    saveDraft(draft);
    if (!active) return;
    window.clearTimeout(writeTimer);
    writeTimer = window.setTimeout(() => { writeAura(draft); }, 40);
  }

  // ---- Efeitos especiais ----
  function writeSpecialUi(cfg: SpecialConfig) {
    spEffect.value = cfg.effect;
    spHint.textContent = SPECIALS[cfg.effect].hint;
    spColor.value = cfg.color;
    spRadius.value = String(cfg.radius);
    spDuration.value = String(cfg.duration);
    spIntensity.value = String(cfg.intensity);
    spSpeed.value = String(cfg.speed);
    spPlacement.value = cfg.placement;
    spBlend.value = cfg.blendMode;
    spPersist.checked = cfg.persist;
    spTrail.checked = cfg.trail;
    spReveal.checked = cfg.revealToken;
    updateSpecialOutputs();
  }

  function readSpecialUi(): SpecialConfig {
    return normalizeSpecial({
      effect: spEffect.value as SpecialId,
      color: spColor.value,
      radius: Number(spRadius.value),
      duration: Number(spDuration.value),
      intensity: Number(spIntensity.value),
      speed: Number(spSpeed.value),
      placement: spPlacement.value,
      blendMode: spBlend.value,
      persist: spPersist.checked,
      trail: spTrail.checked,
      revealToken: spReveal.checked
    });
  }

  function updateSpecialOutputs() {
    spDurationValue.value = `${spDuration.value} s`;
    spIntensityValue.value = `${Math.round(Number(spIntensity.value) * 100)}%`;
    spSpeedValue.value = `${Number(spSpeed.value).toFixed(1)}×`;
  }

  function spMessage(text: string) {
    spStatus.textContent = text;
    spStatus.hidden = !text;
  }

  function onSpecialEdit() {
    spDraft = readSpecialUi();
    saveSpecialDraft(spDraft);
    updateSpecialOutputs();
  }

  // Trocar de efeito traz as sugestões dele (cor, duração e se permanece); o resto da escolha é mantido.
  function onSpecialEffect() {
    const def = SPECIALS[spEffect.value as SpecialId];
    spDraft = { ...readSpecialUi(), color: def.color, duration: def.duration, persist: def.persist };
    saveSpecialDraft(spDraft);
    writeSpecialUi(spDraft);
  }

  async function isGameMaster() {
    try { return (await OBR.player.getRole()) === "GM"; } catch { return false; }
  }

  async function fireSpecial() {
    if (!(await isGameMaster())) { spMessage("Só o mestre pode disparar efeitos especiais."); return; }
    if (!selected.length) { spMessage("Selecione um token ou um desenho no mapa."); return; }
    try {
      const cfg = readSpecialUi();
      const dpi = await OBR.scene.grid.getDpi();
      const now = Date.now();
      const meta = await OBR.scene.getMetadata();
      let runs = pruneRuns(readRuns(meta), now);
      const items = await OBR.scene.items.getItems(selected.map((item) => item.id));
      let fired = 0;
      let skipped = 0;
      for (const item of items) {
        if (runs.length >= MAX_RUNS) { skipped++; continue; }
        let center: { x: number; y: number } | undefined;
        if (isShape(item) && (item.shapeType === "CIRCLE" || item.shapeType === "HEXAGON")) {
          try { center = (await OBR.scene.items.getItemBounds([item.id])).center; } catch { /* usa a posição */ }
        }
        const geom = snapshotGeometry(item, cfg, dpi, center);
        if (!geom) { skipped++; continue; }
        runs = [...runs, makeRun(cfg, geom, item, dpi, now)];
        fired++;
      }
      await OBR.scene.setMetadata({ [SPECIAL_RUNS_KEY]: { runs } });
      spMessage(skipped
        ? `${fired} disparado(s); ${skipped} não coube(ram) (limite de ${MAX_RUNS} efeitos na cena).`
        : "");
    } catch (error) {
      console.error(error);
      spMessage(`Não foi possível disparar: ${String(error)}`);
    }
  }

  async function stopSpecial(all: boolean) {
    if (!(await isGameMaster())) { spMessage("Só o mestre pode desfazer efeitos especiais."); return; }
    try {
      const now = Date.now();
      const ids = new Set(selected.map((item) => item.id));
      const meta = await OBR.scene.getMetadata();
      const runs = readRuns(meta);
      let changed = 0;
      const next = runs.map((run) => {
        if (run.endedAt !== undefined || (!all && !ids.has(run.itemId))) return run;
        changed++;
        return { ...run, endedAt: now };
      });
      if (!changed) { spMessage(all ? "Não há efeitos ativos na cena." : "Este item não tem efeito ativo."); return; }
      await OBR.scene.setMetadata({ [SPECIAL_RUNS_KEY]: { runs: next } });
      spMessage("");
    } catch (error) {
      console.error(error);
      spMessage(`Não foi possível desfazer: ${String(error)}`);
    }
  }

  function onEdit() {
    draft = readUi();
    updateOutputs();
    updateRows();
    commit();
  }

  function onPreset() {
    const preset: PresetDef = PRESETS[presetEl.value as Preset];
    const onlyAreas = selected.length > 0 && selected.every(isArea);
    draft = {
      ...readUi(),
      color: preset.color,
      intensity: preset.intensity,
      speed: preset.speed,
      softness: preset.softness,
      ...(preset.radius !== undefined && !onlyAreas ? { radius: preset.radius } : {})
    };
    writeUi(draft);
    commit();
  }

  for (const el of [colorEl, gradientColorEl, gradientColor2El, gradientAngleEl, gradientStop2El, radiusEl, softnessEl, intensityEl, speedEl, angleEl, widthEl]) el.addEventListener("input", onEdit);
  for (const el of [gradientEnabledEl, gradientModeEl, shapeEl, placementEl, blendEl, scheduleEl]) el.addEventListener("change", onEdit);
  for (const el of [spColor, spRadius, spDuration, spIntensity, spSpeed]) el.addEventListener("input", onSpecialEdit);
  for (const el of [spPlacement, spBlend, spPersist, spTrail, spReveal]) el.addEventListener("change", onSpecialEdit);
  spEffect.addEventListener("change", onSpecialEffect);
  spFire.addEventListener("click", () => { void fireSpecial(); });
  spStop.addEventListener("click", () => { void stopSpecial(false); });
  spClear.addEventListener("click", () => { void stopSpecial(true); });
  writeSpecialUi(spDraft);
  dirPad.addEventListener("click", (event) => {
    const button = (event.target as HTMLElement).closest<HTMLButtonElement>(".dir-btn");
    if (!button) return;
    direction = button.dataset.dir as Direction;
    onEdit();
  });

  function renderMine() {
    mineEl.innerHTML = "";
    mineEl.append(new Option("— meus presets —", ""));
    for (const p of loadSavedPresets()) mineEl.append(new Option(p.name, p.id));
  }
  renderMine();
  $<HTMLButtonElement>("#mineSave").addEventListener("click", () => {
    const list = savePreset(mineName.value, readUi());
    mineName.value = "";
    renderMine();
    showStatus(`Preset salvo (${list.length} no total).`);
  });
  $<HTMLButtonElement>("#mineApply").addEventListener("click", () => {
    const found = loadSavedPresets().find((p) => p.id === mineEl.value);
    if (!found) { showStatus("Escolha um preset da lista."); return; }
    draft = normalizeConfig(found.config);
    writeUi(draft);
    commit();
    showStatus(`Preset "${found.name}" aplicado.`);
  });
  $<HTMLButtonElement>("#mineDelete").addEventListener("click", () => {
    if (!mineEl.value) { showStatus("Escolha um preset da lista."); return; }
    deletePreset(mineEl.value);
    renderMine();
    showStatus("Preset apagado.");
  });
  $<HTMLButtonElement>("#mineIO").addEventListener("click", () => {
    ioBox.hidden = !ioBox.hidden;
    if (!ioBox.hidden) mineText.value = exportPresets();
  });
  $<HTMLButtonElement>("#mineImport").addEventListener("click", () => {
    const n = importPresets(mineText.value);
    renderMine();
    showStatus(n ? `${n} preset(s) importado(s).` : "Texto inválido: nada foi importado.");
  });

  qualityEl.value = getSettings().quality;
  qualityEl.addEventListener("change", () => setSettings({ quality: qualityEl.value as Quality }));
  presetEl.addEventListener("change", onPreset);

  hideEl.addEventListener("change", async () => {
    const areas = selected.filter(isArea);
    if (!areas.length) return;
    const hide = hideEl.checked;
    try {
      await OBR.scene.items.updateItems(areas, (items) => {
        for (const item of items) {
          if (!isArea(item)) continue;
          if (hide) hideDrawing(item); else showDrawing(item);
        }
      });
      showStatus("");
    } catch (error) {
      console.error(error);
      showStatus("Não foi possível alterar o desenho.");
    }
  });

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
    manualIds = [];
    refresh("force");
  });

  OBR.scene.items.onChange(() => {
    refresh("soft");
  });

  OBR.scene.onReadyChange(() => {
    refresh("force");
  });

  window.addEventListener("storage", (e) => {
    if (e.key === SEL_KEY) refresh("force");
  });

  pickEl.addEventListener("change", () => {
    const id = pickEl.value;
    if (!id) return;
    manualIds = [id];
    OBR.player.select([id]).catch(() => {});
    refresh("force");
  });

  window.setInterval(() => { refresh("poll"); }, 1000);

  writeUi(draft);
  refresh("force");
}

OBR.onReady(() => {
  document.body.classList.add("obr-ready");
  render();
});
