import OBR, { buildEffect, isImage, isShape } from "@owlbear-rodeo/sdk";
import type { Image, Item, Layer } from "@owlbear-rodeo/sdk";
import {
  AURA_KEY, EDITOR_ID, EXTENSION_ID, SETTINGS_KEY, areaGeometry, areaPolygon, getAura,
  getSettings, hexToRgb, isArea, isAuraTarget, isDirectional, loadDraft, rotate, shaderFor,
  showDrawing, tokenCenter, tokenShapeUniforms, USE_SIDEBAR, VERSION, writeSharedSelection
} from "./shared";
import type { Area, AuraConfig, Quality } from "./shared";
import { lightIsOn, readClock } from "./clock";
import type { ClockState, Schedule } from "./clock";
import {
  SPECIAL_RUNS_KEY, SPECIAL_STAGE, SPECIAL_TAG, pruneRuns, readRuns, revealAt, runFrame, runSeed, runState
} from "./special";
import type { Run, RunStage, RunState } from "./special";
import { specialShader } from "./special-shaders";

// Marca nos efeitos locais de qual token eles são, e a "assinatura" da última configuração aplicada.
const TAG = `${EXTENSION_ID}/effect-for`;
const SIG = `${EXTENSION_ID}/signature`;
function assetUrl(file: string) {
  // Caminho absoluto: o Owlbear carrega ícones fora do iframe da extensão.
  return new URL(file, document.baseURI).href;
}

// ---------- Desenho dos efeitos ----------

// Rotação do efeito de um token. Cone e linha apontam numa direção fixa do mapa, então não giram com o token.
// O quadrado acompanha a rotação do token; o círculo não depende dela.
function effectRotationFor(token: Image, cfg: AuraConfig) {
  return cfg.shape === "square" ? token.rotation : 0;
}

function effectProps(token: Image, cfg: AuraConfig, dpi: number, effectRotation: number, quality: Quality) {
  const radius = Math.max(0.5, cfg.radius) * dpi;
  const center = tokenCenter(token, dpi);
  // A posição de um efeito é o canto superior esquerdo (girado em torno dele mesmo).
  const half = rotate({ x: radius, y: radius }, effectRotation);
  const u = tokenShapeUniforms(cfg);
  return {
    width: radius * 2,
    height: radius * 2,
    position: { x: center.x - half.x, y: center.y - half.y },
    layer: (cfg.placement === "above" ? "ATTACHMENT" : "DRAWING") as Layer,
    blendMode: cfg.blendMode,
    uniforms: [
      { name: "auraColor", value: hexToRgb(cfg.color) },
      { name: "gradientColor", value: hexToRgb(cfg.gradientColor) },
      { name: "gradientColor2", value: hexToRgb(cfg.gradientColor2) },
            { name: "gradientEnabled", value: cfg.gradientEnabled ? 1 : 0 },
      { name: "gradientMode", value: cfg.gradientMode === "radial" ? 1 : 0 },
      { name: "gradientAngle", value: (cfg.gradientAngle * Math.PI) / 180 },
      { name: "gradientStop2", value: cfg.gradientStop2 },
            { name: "intensity", value: cfg.intensity },
      { name: "speed", value: cfg.speed },
      { name: "softness", value: cfg.softness },
      { name: "shape", value: u.shapeId },
      { name: "coneHalf", value: u.coneHalf },
      { name: "coneIn", value: u.coneIn },
      { name: "beamHalf", value: u.beamHalf },
      { name: "dirRad", value: u.dirRad }
    ],
    sksl: shaderFor(cfg.preset, quality)
  };
}

// Tudo que, se mudar, exige atualizar o efeito. A posição do item fica de fora:
// o próprio Owlbear move efeitos anexados junto com o item.
// Cone, linha e quadrado incluem a rotação do token: como o Owlbear gira os efeitos anexados junto com o item,
// o efeito é corrigido a cada giro (cone/linha voltam à direção fixa; o quadrado acompanha o token).
function signature(item: Image | Area, cfg: AuraConfig, dpi: number, quality: Quality) {
  if (isImage(item)) {
    const rot = isDirectional(cfg) || cfg.shape === "square" ? item.rotation : 0;
    return JSON.stringify([cfg, dpi, quality, rot, item.scale, item.image.width, item.image.height, item.grid]);
  }
  const shape = isShape(item) ? [item.shapeType, item.width, item.height] : [hash(JSON.stringify(item.points))];
  return JSON.stringify([cfg, dpi, quality, shape, item.scale, item.rotation]);
}

function hash(text: string) {
  let h = 5381;
  for (let i = 0; i < text.length; i++) h = ((h << 5) + h + text.charCodeAt(i)) | 0;
  return h;
}

type Props = ReturnType<typeof effectProps>;

// Para desenhos: a caixa do efeito envolve o contorno (mais a expansão) e o shader leva o contorno embutido.
async function areaProps(item: Area, cfg: AuraConfig, dpi: number, quality: Quality): Promise<Props> {
  let center: { x: number; y: number } | undefined;
  if (isShape(item) && (item.shapeType === "CIRCLE" || item.shapeType === "HEXAGON")) {
    try { center = (await OBR.scene.items.getItemBounds([item.id])).center; } catch { /* usa a posição */ }
  }
  const geo = areaGeometry(areaPolygon(item, center), cfg, dpi, quality);
  return {
    width: geo.width,
    height: geo.height,
    position: { x: geo.x, y: geo.y },
    layer: (cfg.placement === "above" ? "ATTACHMENT" : "DRAWING") as Layer,
    blendMode: cfg.blendMode,
    uniforms: [
      { name: "auraColor", value: hexToRgb(cfg.color) },
      { name: "gradientColor", value: hexToRgb(cfg.gradientColor) },
      { name: "gradientColor2", value: hexToRgb(cfg.gradientColor2) },
            { name: "gradientEnabled", value: cfg.gradientEnabled ? 1 : 0 },
      { name: "gradientMode", value: cfg.gradientMode === "radial" ? 1 : 0 },
      { name: "gradientAngle", value: (cfg.gradientAngle * Math.PI) / 180 },
      { name: "gradientStop2", value: cfg.gradientStop2 },
            { name: "intensity", value: cfg.intensity },
      { name: "speed", value: cfg.speed },
      { name: "softness", value: cfg.softness }
    ],
    sksl: geo.sksl
  } as unknown as Props;
}

function createEffect(item: Image | Area, cfg: AuraConfig, dpi: number, quality: Quality, props: Props, rotation: number) {
  return buildEffect()
    .effectType("STANDALONE")
    .width(props.width)
    .height(props.height)
    .position(props.position)
    .rotation(rotation)
    .attachedTo(item.id)
    .layer(props.layer)
    .blendMode(props.blendMode)
    .locked(true)
    .disableHit(true)
    .uniforms(props.uniforms)
    .sksl(props.sksl)
    .metadata({ [TAG]: item.id, [SIG]: signature(item, cfg, dpi, quality) })
    .build();
}

// Relógio do Dynamic Day Cycle (metadados da cena). null = não usado: tudo continua sempre aceso.
let clock: ClockState | null = null;
// Itens com agenda e o último resultado aplicado; o intervalo abaixo só dispara sync quando algum muda.
let gated: { id: string; schedule: Schedule }[] = [];
let lastGate = "";
function gateSignature(now: number) {
  return gated.map((g) => g.id + (lightIsOn(g.id, g.schedule, clock, now) ? "1" : "0")).join("|");
}

async function sync() {
  const dpi = await OBR.scene.grid.getDpi();
  const items = await OBR.scene.items.getItems();
  const { quality } = getSettings();

  const wanted = new Map<string, { item: Image | Area; cfg: AuraConfig }>();
  const now = Date.now();
  const nextGated: { id: string; schedule: Schedule }[] = [];
  for (const item of items) {
    if (!isAuraTarget(item)) continue;
    const cfg = getAura(item);
    if (!cfg) continue;
    if (cfg.schedule !== "always") nextGated.push({ id: item.id, schedule: cfg.schedule });
    // Fora do horário: o item é tratado como sem aura (some o efeito).
    if (!lightIsOn(item.id, cfg.schedule, clock, now)) continue;
    wanted.set(item.id, { item, cfg });
  }

  gated = nextGated;
  lastGate = gateSignature(now);

  const locals = await OBR.scene.local.getItems();
  const existing = new Map<string, Item>();
  const stale: string[] = [];
  for (const local of locals) {
    const itemId = local.metadata[TAG];
    if (typeof itemId !== "string") continue;
    if (wanted.has(itemId) && !existing.has(itemId)) existing.set(itemId, local);
    else stale.push(local.id); // item sem aura, apagado ou efeito duplicado
  }

  if (stale.length) await OBR.scene.local.deleteItems(stale);

  const toAdd: Item[] = [];
  const toUpdate: { effect: Item; item: Image | Area; cfg: AuraConfig; sig: string; area?: Props }[] = [];
  for (const [itemId, { item, cfg }] of wanted) {
    const effect = existing.get(itemId);
    const sig = signature(item, cfg, dpi, quality);
    if (!effect) {
      if (isImage(item)) {
        const rot = effectRotationFor(item, cfg);
        toAdd.push(createEffect(item, cfg, dpi, quality, effectProps(item, cfg, dpi, rot, quality), rot));
      } else {
        toAdd.push(createEffect(item, cfg, dpi, quality, await areaProps(item, cfg, dpi, quality), 0));
      }
    } else if (effect.metadata[SIG] !== sig) {
      toUpdate.push({ effect, item, cfg, sig, area: isImage(item) ? undefined : await areaProps(item, cfg, dpi, quality) });
    }
  }

  if (toAdd.length) await OBR.scene.local.addItems(toAdd);

  if (toUpdate.length) {
    const byId = new Map(toUpdate.map((u) => [u.effect.id, u]));
    // Atualiza no lugar (sem apagar e recriar), então a troca é instantânea e sem piscar.
    await OBR.scene.local.updateItems(toUpdate.map((u) => u.effect), (drafts) => {
      for (const draft of drafts) {
        const u = byId.get(draft.id);
        if (!u) continue;
        const fx = draft as any;
        let props: Props;
        if (u.area) {
          // Desenho: o contorno já está em coordenadas do mapa, então o efeito volta a rotação 0.
          fx.rotation = 0;
          props = u.area;
        } else {
          const token = u.item as Image;
          // Cone/linha ficam fixos no mapa (rotação 0); o quadrado acompanha o token.
          fx.rotation = effectRotationFor(token, u.cfg);
          props = effectProps(token, u.cfg, dpi, fx.rotation ?? 0, quality);
        }
        fx.width = props.width;
        fx.height = props.height;
        fx.scale = { x: 1, y: 1 };
        fx.position = props.position;
        fx.layer = props.layer;
        fx.blendMode = props.blendMode;
        fx.uniforms = props.uniforms;
        fx.sksl = props.sksl;
        fx.metadata[SIG] = u.sig;
      }
    });
  }
}

// Evita duas sincronizações ao mesmo tempo; se chegar mudança no meio, roda de novo no fim.
let running = false;
let again = false;
function queueSync() {
  if (running) { again = true; return; }
  running = true;
  (async () => {
    try {
      do {
        again = false;
        try { await sync(); } catch (error) { console.error("Dynamic Auras: falha ao sincronizar", error); }
      } while (again);
    } finally {
      running = false;
    }
  })();
}

// ---------- Painel lateral ----------

async function openPanel() {
  // Fecha o painel anterior para nunca ficarem dois abertos.
  try { await OBR.action.close(); } catch { /* ignora */ }
  try { await OBR.popover.close(EDITOR_ID); } catch { /* ignora */ }

  if (!USE_SIDEBAR) {
    // Usa o painel do ícone da barra (manifest): o caminho mais simples e testado.
    await OBR.action.open();
    return;
  }

  const [width] = await Promise.all([OBR.viewport.getWidth()]);
  await OBR.popover.open({
    id: EDITOR_ID,
    url: `${assetUrl("index.html")}?v=${VERSION}`,
    width: 340,
    height: 520,
    anchorReference: "POSITION",
    anchorPosition: { left: width - 360, top: 64 },
    anchorOrigin: { horizontal: "LEFT", vertical: "TOP" },
    transformOrigin: { horizontal: "RIGHT", vertical: "TOP" },
    disableClickAway: true
  });
}

// ---------- Menu de contexto (botão direito no token) ----------

const imageNotMap = [
  { key: "type", value: "IMAGE" },
  { key: "layer", value: "MAP", operator: "!=" as const }
];
const noAura = { key: ["metadata", AURA_KEY], value: undefined };
const hasAura = { key: ["metadata", AURA_KEY], operator: "!=" as const, value: undefined };

// Desenhos: formas e curvas (a "some" vale por item: cada item precisa ser uma forma OU uma curva).
const shapeOrCurve = [
  { key: "type", value: "SHAPE" },
  { key: "type", value: "CURVE" }
];

function setupContextMenu() {
  OBR.contextMenu.create({
    id: `${EXTENSION_ID}/enable`,
    icons: [{
      icon: assetUrl("aura-on.svg"),
      label: "Ativar aura",
      filter: { every: [...imageNotMap, noAura], permissions: ["UPDATE"] }
    }],
    async onClick(context) {
      writeSharedSelection(context.items.map((i) => i.id));
      const config = loadDraft();
      await OBR.scene.items.updateItems(context.items, (items) => {
        for (const item of items) item.metadata[AURA_KEY] = { ...config };
      });
      await openPanel();
    }
  });

  OBR.contextMenu.create({
    id: `${EXTENSION_ID}/edit`,
    icons: [{
      icon: assetUrl("aura-edit.svg"),
      label: "Editar aura",
      filter: { every: [...imageNotMap, hasAura], permissions: ["UPDATE"] }
    }],
    async onClick(context) {
      writeSharedSelection(context.items.map((i) => i.id));
      await openPanel();
    }
  });

  OBR.contextMenu.create({
    id: `${EXTENSION_ID}/disable`,
    icons: [{
      icon: assetUrl("aura-off.svg"),
      label: "Desligar aura",
      filter: { every: [...imageNotMap, hasAura], permissions: ["UPDATE"] }
    }],
    async onClick(context) {
      await OBR.scene.items.updateItems(context.items, (items) => {
        for (const item of items) delete item.metadata[AURA_KEY];
      });
    }
  });

  // ---- Desenhos (luz ambiente) ----
  OBR.contextMenu.create({
    id: `${EXTENSION_ID}/enable-area`,
    icons: [{
      icon: assetUrl("aura-on.svg"),
      label: "Ativar luz ambiente",
      filter: { every: [noAura], some: shapeOrCurve, permissions: ["UPDATE"] }
    }],
    async onClick(context) {
      writeSharedSelection(context.items.map((i) => i.id));
      // Em desenhos o "raio" é a expansão da luz para fora do contorno: começa em 1 quadrado.
      const config = { ...loadDraft(), radius: 1 };
      await OBR.scene.items.updateItems(context.items, (items) => {
        for (const item of items) item.metadata[AURA_KEY] = { ...config };
      });
      await openPanel();
    }
  });

  OBR.contextMenu.create({
    id: `${EXTENSION_ID}/edit-area`,
    icons: [{
      icon: assetUrl("aura-edit.svg"),
      label: "Editar luz ambiente",
      filter: { every: [hasAura], some: shapeOrCurve, permissions: ["UPDATE"] }
    }],
    async onClick(context) {
      writeSharedSelection(context.items.map((i) => i.id));
      await openPanel();
    }
  });

  OBR.contextMenu.create({
    id: `${EXTENSION_ID}/disable-area`,
    icons: [{
      icon: assetUrl("aura-off.svg"),
      label: "Desligar luz ambiente",
      filter: { every: [hasAura], some: shapeOrCurve, permissions: ["UPDATE"] }
    }],
    async onClick(context) {
      await OBR.scene.items.updateItems(context.items, (items) => {
        for (const item of items) {
          delete item.metadata[AURA_KEY];
          if (isArea(item)) showDrawing(item); // devolve a opacidade original do desenho
        }
      });
    }
  });
}

// ---------- Efeitos especiais ----------
// Os disparos ficam nos metadados da cena (gravados pelo mestre). Cada navegador desenha o efeito localmente e
// calcula o andamento pela hora do disparo, então todos veem a mesma coisa sem trocar mensagens a cada quadro.

let runs: Run[] = [];
let isGm = false;
// Efeito local de cada disparo e o estágio em que ele foi criado (muda de "main" para "trail" no rastro).
const specialLocals = new Map<string, { itemId: string; stage: RunStage }>();
// Disparos cujo último quadro (estado final) já foi enviado: evita atualizar sem necessidade.
const settled = new Set<string>();

function specialUniforms(run: Run, st: RunState) {
  return [
    { name: "intensity", value: run.intensity },
    { name: "speed", value: run.speed },
    { name: "fxColor", value: hexToRgb(run.color) },
    { name: "progress", value: st.progress },
    { name: "fade", value: st.fade },
    { name: "seed", value: runSeed(run.id) }
  ];
}

function buildSpecialEffect(run: Run, st: RunState) {
  const frame = runFrame(run);
  return buildEffect()
    .effectType("STANDALONE")
    .width(frame.width)
    .height(frame.height)
    .position({ x: frame.x, y: frame.y })
    .layer((run.placement === "above" ? "ATTACHMENT" : "DRAWING") as Layer)
    .blendMode(run.blendMode)
    .locked(true)
    .disableHit(true)
    .uniforms(specialUniforms(run, st))
    .sksl(specialShader(st.effect, frame.geometry))
    .metadata({ [SPECIAL_TAG]: run.id, [SPECIAL_STAGE]: st.stage })
    .build();
}

async function syncSpecials() {
  const now = Date.now();
  const wanted = new Map<string, { run: Run; st: RunState }>();
  for (const run of runs) {
    const st = runState(run, now);
    if (st.stage !== "done") wanted.set(run.id, { run, st });
  }

  const locals = await OBR.scene.local.getItems();
  const keep = new Map<string, Item>();
  const stale: string[] = [];
  for (const local of locals) {
    const runId = local.metadata[SPECIAL_TAG];
    if (typeof runId !== "string") continue;
    const w = wanted.get(runId);
    if (w && !keep.has(runId) && local.metadata[SPECIAL_STAGE] === w.st.stage) keep.set(runId, local);
    else stale.push(local.id); // disparo terminado, desfeito, duplicado ou em outro estágio
  }
  if (stale.length) await OBR.scene.local.deleteItems(stale);

  const toAdd: Item[] = [];
  specialLocals.clear();
  for (const [runId, { run, st }] of wanted) {
    const existing = keep.get(runId);
    if (existing) {
      specialLocals.set(runId, { itemId: existing.id, stage: st.stage });
      continue;
    }
    const effect = buildSpecialEffect(run, st);
    toAdd.push(effect);
    specialLocals.set(runId, { itemId: effect.id, stage: st.stage });
    settled.delete(runId + st.stage);
  }
  if (toAdd.length) await OBR.scene.local.addItems(toAdd);
}

let specialRunning = false;
let specialAgain = false;
function queueSpecialSync() {
  if (specialRunning) { specialAgain = true; return; }
  specialRunning = true;
  (async () => {
    try {
      do {
        specialAgain = false;
        try { await syncSpecials(); } catch (error) { console.error("Dynamic Auras: falha nos efeitos especiais", error); }
      } while (specialAgain);
    } finally {
      specialRunning = false;
    }
  })();
}

// Andamento: só atualiza os efeitos que ainda estão mudando (entrada, saída e rastro). Depois que o efeito
// chega ao ápice e fica parado, o próprio shader continua animando os movimentos em repetição.
let ticking = false;
async function specialTick() {
  if (ticking || specialRunning || !runs.length) return;
  ticking = true;
  try {
    const now = Date.now();
    const updates: { id: string; run: Run; st: RunState; key: string }[] = [];
    let resync = false;
    for (const run of runs) {
      const st = runState(run, now);
      const cur = specialLocals.get(run.id);
      if (st.stage === "done") { if (cur) resync = true; continue; }
      if (!cur || cur.stage !== st.stage) { resync = true; continue; }
      const key = run.id + st.stage;
      if (st.animating) { settled.delete(key); updates.push({ id: cur.itemId, run, st, key }); }
      else if (!settled.has(key)) { updates.push({ id: cur.itemId, run, st, key }); settled.add(key); }
    }
    if (resync) queueSpecialSync();
    if (updates.length) {
      const byId = new Map(updates.map((u) => [u.id, u]));
      await OBR.scene.local.updateItems(updates.map((u) => u.id), (drafts) => {
        for (const draft of drafts) {
          const u = byId.get(draft.id);
          if (u) (draft as any).uniforms = specialUniforms(u.run, u.st);
        }
      });
    }
  } catch (error) {
    console.error("Dynamic Auras: falha ao animar efeito especial", error);
  } finally {
    ticking = false;
  }
}

// Só o mestre mexe nos itens e nos metadados da cena: revela tokens no ápice e limpa disparos antigos.
let housekeeping = false;
async function specialHousekeeping() {
  if (!isGm || housekeeping || !runs.length) return;
  housekeeping = true;
  try {
    const now = Date.now();
    const due = runs.filter((run) => {
      const at = revealAt(run);
      return at !== null && now >= at;
    });
    if (due.length) {
      const ids = due.map((run) => run.revealItemId!).filter((id, i, all) => all.indexOf(id) === i);
      await OBR.scene.items.updateItems(ids, (items) => {
        for (const item of items) item.visible = true;
      });
      const next = runs.map((run) => (due.includes(run) ? { ...run, revealed: true } : run));
      await OBR.scene.setMetadata({ [SPECIAL_RUNS_KEY]: { runs: next } });
      return;
    }
    const kept = pruneRuns(runs, now);
    if (kept.length !== runs.length) await OBR.scene.setMetadata({ [SPECIAL_RUNS_KEY]: { runs: kept } });
  } catch (error) {
    console.error("Dynamic Auras: falha ao revelar ou limpar efeitos especiais", error);
  } finally {
    housekeeping = false;
  }
}

function applyRunsFromMeta(meta: unknown) {
  runs = readRuns(meta);
  queueSpecialSync();
}

// ---------- Início ----------

let unsubscribers: Array<() => void> = [];
function start() {
  stop();
  unsubscribers = [
    OBR.scene.items.onChange(() => queueSync()),
    OBR.scene.grid.onChange(() => queueSync()),
    OBR.scene.onMetadataChange((meta) => {
      clock = readClock(meta);
      queueSync();
      applyRunsFromMeta(meta);
    })
  ];
  OBR.scene.getMetadata().then((meta) => {
    clock = readClock(meta);
    queueSync();
    applyRunsFromMeta(meta);
  }).catch(() => queueSync());
}
function stop() {
  for (const unsubscribe of unsubscribers) unsubscribe();
  unsubscribers = [];
  clock = null;
  gated = [];
  lastGate = "";
  runs = [];
  specialLocals.clear();
  settled.clear();
}

OBR.onReady(async () => {
  setupContextMenu();
  // O script de fundo espelha a seleção do jogador para o painel (segunda fonte, caso a do painel falhe).
  OBR.player.onChange((player) => writeSharedSelection(player.selection ?? []));
  OBR.player.getSelection().then((ids) => writeSharedSelection(ids ?? [])).catch(() => {});
  // A qualidade é gravada pelo painel (mesma origem): reaplica quando mudar.
  window.addEventListener("storage", (e) => {
    if (e.key === SETTINGS_KEY) queueSync();
  });
  // A hora é calculada localmente: uma vez por segundo vê se alguma luz com agenda deve ligar ou desligar.
  window.setInterval(() => {
    if (gated.length && gateSignature(Date.now()) !== lastGate) queueSync();
  }, 1000);
  // Papel do jogador: só o mestre revela tokens e limpa disparos antigos.
  OBR.player.getRole().then((role) => { isGm = role === "GM"; }).catch(() => {});
  OBR.player.onChange((player) => { isGm = player.role === "GM"; });
  // Andamento dos efeitos especiais (cerca de 30 quadros por segundo, só enquanto algo está mudando).
  window.setInterval(() => { void specialTick(); }, 33);
  window.setInterval(() => { void specialHousekeeping(); }, 250);
  OBR.scene.onReadyChange((ready) => (ready ? start() : stop()));
  if (await OBR.scene.isReady()) start();
});
