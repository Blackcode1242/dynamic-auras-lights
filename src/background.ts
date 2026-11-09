import OBR, { buildEffect, isImage, isShape } from "@owlbear-rodeo/sdk";
import * as SDK from "@owlbear-rodeo/sdk";
import type { Image, Item, Layer } from "@owlbear-rodeo/sdk";
import {
  AURA_KEY, EDITOR_ID, EXTENSION_ID, SETTINGS_KEY, areaGeometry, areaPolygon, fogParams, getAura,
  getSettings, hexToRgb, isArea, isAuraTarget, isDirectional, loadDraft, rotate, shaderFor,
  showDrawing, tokenCenter, tokenShapeUniforms, USE_SIDEBAR, VERSION, writeSharedSelection, writeStatus
} from "./shared";
import type { Area, AuraConfig, Quality } from "./shared";
import { lightIsOn, readClock } from "./clock";
import type { ClockState, Schedule } from "./clock";

// Marca nos efeitos locais de qual token eles são, e a "assinatura" da última configuração aplicada.
const TAG = `${EXTENSION_ID}/effect-for`;
const SIG = `${EXTENSION_ID}/signature`;
// Luzes do Dynamic Fog (itens LIGHT locais): qual token, assinatura e tipo (redonda ou cone).
const FOGTAG = `${EXTENSION_ID}/fog-for`;
const FOGSIG = `${EXTENSION_ID}/fog-signature`;
const FOGKIND = `${EXTENSION_ID}/fog-kind`;

function assetUrl(file: string) {
  // Caminho absoluto: o Owlbear carrega ícones fora do iframe da extensão.
  return new URL(file, document.baseURI).href;
}

// ---------- Desenho dos efeitos ----------

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
// Cone e linha incluem a rotação: o efeito é reposicionado quando o token gira.
function signature(item: Image | Area, cfg: AuraConfig, dpi: number, quality: Quality) {
  if (isImage(item)) {
    const rot = isDirectional(cfg) ? item.rotation : 0;
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

// ---------- Luzes do Dynamic Fog ----------
// O fog dinâmico é nativo do Owlbear (item LIGHT, só local). Cada pessoa cria as suas luzes aqui.
type FogWanted = Map<string, { token: Image; cfg: AuraConfig }>;

function makeLight(token: Image, fp: ReturnType<typeof fogParams>, sig: string, kind: string) {
  const buildLight = (SDK as any).buildLight as () => any;
  const b = buildLight()
    .position(fp.position)
    .rotation(fp.rotation)
    .attenuationRadius(fp.attenuationRadius)
    .sourceRadius(fp.sourceRadius)
    .falloff(fp.falloff)
    .attachedTo(token.id)
    .locked(true)
    .disableHit(true)
    .zIndex(0) // 0 ou mais: a luz corta o fog estático em vez de ficar escondida por ele
    .metadata({ [FOGTAG]: token.id, [FOGSIG]: sig, [FOGKIND]: kind });
  if (fp.directional) b.innerAngle(fp.innerAngle).outerAngle(fp.outerAngle);
  const light = b.build();
  light.lightType = fp.lightType; // o builder não tem método para o tipo da luz
  return light as Item;
}

async function syncFog(locals: Item[], wanted: FogWanted, dpi: number, quality: Quality, fogOffset: number) {
  const supported = typeof (SDK as any).buildLight === "function";
  if (!supported) {
    if (wanted.size) writeStatus({ fog: "indisponível: esta versão do SDK não tem buildLight (atualize @owlbear-rodeo/sdk)" });
    return;
  }

  const existing = new Map<string, Item>();
  const stale: string[] = [];
  for (const local of locals) {
    const tokenId = local.metadata[FOGTAG];
    if (typeof tokenId !== "string") continue;
    if (wanted.has(tokenId) && !existing.has(tokenId)) existing.set(tokenId, local);
    else stale.push(local.id);
  }

  const toAdd: Item[] = [];
  const toUpdate: { light: Item; fp: ReturnType<typeof fogParams>; sig: string }[] = [];
  for (const [tokenId, { token, cfg }] of wanted) {
    const fp = fogParams(token, cfg, dpi, quality, fogOffset);
    const kind = fp.directional ? "cone" : "round";
    const sig = `${signature(token, cfg, dpi, quality)}|${token.rotation}|${fogOffset}`;
    const light = existing.get(tokenId);
    if (!light) toAdd.push(makeLight(token, fp, sig, kind));
    else if (light.metadata[FOGKIND] !== kind) {
      // Troca entre redonda e cone: recria, porque os ângulos não podem ser "desligados" no lugar.
      stale.push(light.id);
      toAdd.push(makeLight(token, fp, sig, kind));
    } else if (light.metadata[FOGSIG] !== sig) toUpdate.push({ light, fp, sig });
  }

  if (stale.length) await OBR.scene.local.deleteItems(stale);
  if (toAdd.length) await OBR.scene.local.addItems(toAdd);
  if (toUpdate.length) {
    const byId = new Map(toUpdate.map((u) => [u.light.id, u]));
    await OBR.scene.local.updateItems(toUpdate.map((u) => u.light), (drafts) => {
      for (const draft of drafts) {
        const u = byId.get(draft.id);
        if (!u) continue;
        const fx = draft as any;
        fx.position = u.fp.position;
        fx.rotation = u.fp.rotation;
        fx.attenuationRadius = u.fp.attenuationRadius;
        fx.sourceRadius = u.fp.sourceRadius;
        fx.falloff = u.fp.falloff;
        if (u.fp.directional) { fx.innerAngle = u.fp.innerAngle; fx.outerAngle = u.fp.outerAngle; }
        fx.lightType = u.fp.lightType;
        fx.metadata[FOGSIG] = u.sig;
      }
    });
  }
  writeStatus({ fog: wanted.size ? `${wanted.size} luz(es) no fog` : "nenhuma luz de fog ligada" });
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
  const { quality, fogOffset } = getSettings();

  const wanted = new Map<string, { item: Image | Area; cfg: AuraConfig }>();
  const fogWanted: FogWanted = new Map();
  const now = Date.now();
  const nextGated: { id: string; schedule: Schedule }[] = [];
  for (const item of items) {
    if (!isAuraTarget(item)) continue;
    const cfg = getAura(item);
    if (!cfg) continue;
    if (cfg.schedule !== "always") nextGated.push({ id: item.id, schedule: cfg.schedule });
    // Fora do horário: o item é tratado como sem aura (some o efeito e a luz do fog).
    if (!lightIsOn(item.id, cfg.schedule, clock, now)) continue;
    wanted.set(item.id, { item, cfg });
    if (isImage(item) && cfg.fog !== "off") fogWanted.set(item.id, { token: item, cfg });
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
        const rot = isDirectional(cfg) ? item.rotation : 0;
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
          // Cone/linha giram com o token; os demais deixam o Owlbear cuidar da rotação.
          if (isDirectional(u.cfg)) fx.rotation = token.rotation;
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

  // O fog é isolado: se a API de luz falhar ou não existir, os efeitos visuais continuam funcionando.
  try {
    await syncFog(locals, fogWanted, dpi, quality, fogOffset);
  } catch (error) {
    console.error("Dynamic Auras: falha ao sincronizar as luzes do fog", error);
    writeStatus({ fog: `erro: ${String(error)}` });
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

// ---------- Início ----------

let unsubscribers: Array<() => void> = [];
function start() {
  stop();
  unsubscribers = [
    OBR.scene.items.onChange(() => queueSync()),
    OBR.scene.grid.onChange(() => queueSync()),
    OBR.scene.onMetadataChange((meta) => { clock = readClock(meta); queueSync(); })
  ];
  OBR.scene.getMetadata().then((meta) => { clock = readClock(meta); queueSync(); }).catch(() => queueSync());
}
function stop() {
  for (const unsubscribe of unsubscribers) unsubscribe();
  unsubscribers = [];
  clock = null;
  gated = [];
  lastGate = "";
}

OBR.onReady(async () => {
  setupContextMenu();
  // O script de fundo espelha a seleção do jogador para o painel (segunda fonte, caso a do painel falhe).
  OBR.player.onChange((player) => writeSharedSelection(player.selection ?? []));
  OBR.player.getSelection().then((ids) => writeSharedSelection(ids ?? [])).catch(() => {});
  // Qualidade e calibração do fog são gravadas pelo painel (mesma origem): reaplica quando mudarem.
  window.addEventListener("storage", (e) => {
    if (e.key === SETTINGS_KEY) queueSync();
  });
  // A hora é calculada localmente: uma vez por segundo vê se alguma luz com agenda deve ligar ou desligar.
  window.setInterval(() => {
    if (gated.length && gateSignature(Date.now()) !== lastGate) queueSync();
  }, 1000);
  OBR.scene.onReadyChange((ready) => (ready ? start() : stop()));
  if (await OBR.scene.isReady()) start();
});
