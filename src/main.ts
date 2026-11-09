import OBR from "@owlbear-rodeo/sdk";
import type { Image } from "@owlbear-rodeo/sdk";
import "./style.css";
import {
  AURA_KEY, BLEND_MODES, EDITOR_ID, GROUP_LABELS, PRESETS,
  deletePreset, exportPresets, getAura, getSettings, hideDrawing, importPresets, isArea, isAuraTarget,
  isHidden, loadDraft, loadSavedPresets, normalizeConfig, readSharedSelection, readStatus, saveDraft,
  savePreset, SEL_KEY, setSettings, showDrawing, VERSION
} from "./shared";
import type { Area, AuraConfig, BlendModeName, FogMode, Group, Placement, Preset, PresetDef, Quality, Schedule, Shape } from "./shared";

let selected: (Image | Area)[] = [];
let active = false;
let draft: AuraConfig = loadDraft();
let lastEdit = 0;
let manualIds: string[] = [];
let lastKey = "";
let pickerKey = "";
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
        <p class="hint">Selecione um token ou um desenho (forma/curva) no mapa. Para ligar direto, clique com o botão direito e escolha <b>Ativar aura</b> (token) ou <b>Ativar luz ambiente</b> (desenho).</p>
        <label for="pick">Ou escolha pela lista</label>
        <select id="pick"><option value="">— escolher —</option></select>
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
            <label for="radius" id="radiusLabel">Raio (quadrados)</label>
            <input id="radius" type="number" min="0.5" max="20" step="0.5" />
          </div>
        </div>
        <div class="row">
          <div class="field grow" id="shapeField">
            <label for="shape">Formato</label>
            <select id="shape">
              <option value="circle">Círculo</option>
              <option value="square">Quadrado</option>
              <option value="cone">Cone</option>
              <option value="line">Linha</option>
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
        <div id="coneRow" hidden>
          <label for="angle">Abertura do cone <output id="angleValue"></output></label>
          <input id="angle" type="range" min="10" max="170" step="1" />
        </div>
        <div id="lineRow" hidden>
          <label for="width">Largura da linha (quadrados)</label>
          <input id="width" type="number" min="0.1" max="10" step="0.1" />
        </div>
        <div id="dirRow" hidden>
          <label for="direction">Direção <output id="directionValue"></output></label>
          <input id="direction" type="range" min="-180" max="180" step="5" />
          <p class="hint small">0° = para onde o token está olhando (topo da imagem). O cone gira junto com o token.</p>
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
        <div id="fogRow">
          <label for="fog">Luz no fog (Dynamic Fog)</label>
          <select id="fog">
            <option value="off">Desligada</option>
            <option value="primary">Primária (revela o fog)</option>
            <option value="secondary">Secundária (só se vista)</option>
            <option value="auxiliary">Auxiliar (faz sombra, não ativa secundárias)</option>
          </select>
          <p class="hint small">Cria uma luz do fog dinâmico do Owlbear no token, com o mesmo alcance e formato. Precisa de paredes/fog dinâmico na cena.</p>
        </div>

        <div id="scheduleRow">
          <label for="schedule">Quando acende (Dynamic Day Cycle)</label>
          <select id="schedule">
            <option value="always">Sempre acesa</option>
            <option value="night">Só à noite (acende ao anoitecer)</option>
            <option value="day">Só de dia</option>
          </select>
          <p class="hint small">Vale só quando a extensão Dynamic Day Cycle está ativa na cena. Vale também para a luz do fog. Cada luz varia alguns minutos para não acender tudo junto.</p>
        </div>

        <details class="mine">
          <summary>Meus presets</summary>
          <select id="mine"><option value="">— meus presets —</option></select>
          <div class="btnrow">
            <button id="mineApply" type="button">Aplicar</button>
            <button id="mineDelete" type="button">Apagar</button>
          </div>
          <input id="mineName" type="text" maxlength="40" placeholder="Nome para salvar a configuração atual" />
          <div class="btnrow">
            <button id="mineSave" type="button">Salvar atual</button>
            <button id="mineIO" type="button">Exportar / importar</button>
          </div>
          <div id="ioBox" hidden>
            <textarea id="mineText" rows="6" spellcheck="false"></textarea>
            <button id="mineImport" type="button">Importar o texto acima</button>
          </div>
        </details>

        <label class="switch" id="hideRow" hidden>
          <input id="hide" type="checkbox" />
          <span class="track"></span>
          <span class="switch-text">Esconder o desenho (opacidade 0)</span>
        </label>
        <p id="status" class="status" hidden></p>
      </section>

      <details class="mine">
        <summary>Desempenho (neste computador)</summary>
        <label for="quality">Qualidade dos efeitos</label>
        <select id="quality">
          <option value="high">Alta (todos os efeitos)</option>
          <option value="medium">Média (efeitos caros viram brilho simples)</option>
          <option value="low">Baixa (só brilho/anel, contornos simples)</option>
        </select>
        <p class="hint small">Vale só para você. Em qualidade média/baixa as luzes do fog usam sombras duras, que são bem mais leves.</p>
        <label for="fogOffset">Ajuste da direção do cone no fog (°)</label>
        <input id="fogOffset" type="number" min="-180" max="180" step="5" />
        <p class="hint small">Se o cone do fog apontar para um lado diferente do cone visual, ajuste aqui (tente 90 ou -90).</p>
      </details>

      <details class="diag">
        <summary>Diagnóstico</summary>
        <pre id="diagText"></pre>
      </details>
      <footer>Versão ${VERSION} · as mudanças valem na hora</footer>
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
  const radiusLabel = $<HTMLElement>("#radiusLabel");
  const hideRow = $<HTMLElement>("#hideRow");
  const hideEl = $<HTMLInputElement>("#hide");
  const pickEl = $<HTMLSelectElement>("#pick");
  const diagEl = $<HTMLElement>("#diagText");
  const closeEl = $<HTMLButtonElement>("#close");
  const shapeField = $<HTMLElement>("#shapeField");
  const coneRow = $<HTMLElement>("#coneRow");
  const lineRow = $<HTMLElement>("#lineRow");
  const dirRow = $<HTMLElement>("#dirRow");
  const fogRow = $<HTMLElement>("#fogRow");
  const angleEl = $<HTMLInputElement>("#angle");
  const widthEl = $<HTMLInputElement>("#width");
  const directionEl = $<HTMLInputElement>("#direction");
  const fogEl = $<HTMLSelectElement>("#fog");
  const scheduleEl = $<HTMLSelectElement>("#schedule");
  const angleValue = $<HTMLOutputElement>("#angleValue");
  const directionValue = $<HTMLOutputElement>("#directionValue");
  const mineEl = $<HTMLSelectElement>("#mine");
  const mineName = $<HTMLInputElement>("#mineName");
  const ioBox = $<HTMLElement>("#ioBox");
  const mineText = $<HTMLTextAreaElement>("#mineText");
  const qualityEl = $<HTMLSelectElement>("#quality");
  const fogOffsetEl = $<HTMLInputElement>("#fogOffset");

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
    angleValue.value = `${angleEl.value}°`;
    directionValue.value = `${directionEl.value}°`;
  }

  // Mostra só os campos que fazem sentido para o formato escolhido.
  function updateRows() {
    const onlyAreas = selected.length > 0 && selected.every(isArea);
    const shape = shapeEl.value;
    coneRow.hidden = onlyAreas || shape !== "cone";
    lineRow.hidden = onlyAreas || shape !== "line";
    dirRow.hidden = onlyAreas || (shape !== "cone" && shape !== "line");
    shapeField.hidden = onlyAreas;
    fogRow.hidden = onlyAreas; // a luz do fog só existe para tokens
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
    angleEl.value = String(cfg.angle);
    widthEl.value = String(cfg.width);
    directionEl.value = String(cfg.direction);
    fogEl.value = cfg.fog;
    scheduleEl.value = cfg.schedule;
    updateOutputs();
    updateRows();
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
      speed: Number(speedEl.value),
      angle: Number(angleEl.value),
      width: Number(widthEl.value),
      direction: Number(directionEl.value),
      fog: fogEl.value as FogMode,
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
    // Em desenhos, o "raio" vira a expansão da luz para fora do contorno (pode ser 0).
    const areas = selected.filter(isArea);
    const onlyAreas = areas.length === selected.length;
    radiusLabel.textContent = onlyAreas ? "Expansão da luz (quadrados)" : "Raio (quadrados)";
    radiusEl.min = onlyAreas ? "0" : "0.5";
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
          if (isArea(item)) showDrawing(item); // devolve a opacidade original do desenho
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

  // Lista de tokens/desenhos da cena: permite escolher o alvo sem depender da seleção no mapa.
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

  // mode: "force" = atualiza tudo; "soft" = não mexe nos controles se você está editando; "poll" = só age se a seleção mudou.
  async function refresh(mode: "force" | "soft" | "poll") {
    const d: Record<string, string> = { versão: VERSION, qualidade: getSettings().quality };
    for (const [k, v] of Object.entries(readStatus())) d[k] = v; // ex.: estado das luzes do fog
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

      // Três fontes, em ordem: seleção lida pelo painel > seleção gravada pelo script de fundo > escolha na lista.
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

  function onEdit() {
    draft = readUi();
    updateOutputs();
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
      // Condições vêm com raio pequeno (em volta do token); em desenhos o raio é outra coisa e não muda.
      ...(preset.radius !== undefined && !onlyAreas ? { radius: preset.radius } : {})
    };
    writeUi(draft);
    commit();
  }

  for (const el of [colorEl, radiusEl, softnessEl, intensityEl, speedEl, angleEl, widthEl, directionEl]) el.addEventListener("input", onEdit);
  for (const el of [shapeEl, placementEl, blendEl, fogEl, scheduleEl]) el.addEventListener("change", onEdit);

  // ---- Meus presets (ficam neste navegador; dá para exportar e importar como texto) ----
  function renderMine() {
    mineEl.innerHTML = "";
    mineEl.append(new Option("— meus presets —", ""));
    for (const p of loadSavedPresets()) mineEl.append(new Option(p.name, p.id)); // Option escapa o nome
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

  // ---- Desempenho (por computador) ----
  qualityEl.value = getSettings().quality;
  fogOffsetEl.value = String(getSettings().fogOffset);
  qualityEl.addEventListener("change", () => setSettings({ quality: qualityEl.value as Quality }));
  fogOffsetEl.addEventListener("change", () => setSettings({ fogOffset: Number(fogOffsetEl.value) || 0 }));
  presetEl.addEventListener("change", onPreset);

  // Desenho invisível: zera preenchimento e contorno (guardando os valores) e só a luz fica visível.
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
    manualIds = []; // a seleção real manda
    refresh("force");
  });

  OBR.scene.items.onChange(() => {
    refresh("soft");
  });

  OBR.scene.onReadyChange(() => {
    refresh("force");
  });

  // O script de fundo avisa quando a seleção muda (outra origem de eventos).
  window.addEventListener("storage", (e) => {
    if (e.key === SEL_KEY) refresh("force");
  });

  pickEl.addEventListener("change", () => {
    const id = pickEl.value;
    if (!id) return;
    manualIds = [id];
    OBR.player.select([id]).catch(() => {}); // também seleciona no mapa
    refresh("force");
  });

  // Rede de segurança: se algum evento não chegar, confere a seleção a cada segundo.
  window.setInterval(() => { refresh("poll"); }, 1000);

  writeUi(draft);
  refresh("force");
}

// Só monta o painel (e só fala com a API do Owlbear) DEPOIS que o SDK estiver pronto.
OBR.onReady(() => {
  document.body.classList.add("obr-ready");
  render();
});
