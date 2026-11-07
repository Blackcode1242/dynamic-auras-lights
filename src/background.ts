import OBR, { buildEffect, isImage, isShape } from "@owlbear-rodeo/sdk";
import type { Image, Item, Layer } from "@owlbear-rodeo/sdk";
import {
  AURA_KEY, EDITOR_ID, EXTENSION_ID, areaGeometry, areaPolygon, getAura, hexToRgb, isArea,
  isAuraTarget, loadDraft, rotate, shaderFor, showDrawing, tokenCenter, USE_SIDEBAR, VERSION,
  writeSharedSelection
} from "./shared";
import type { Area, AuraConfig } from "./shared";

// Marca nos efeitos locais de qual token eles são, e a "assinatura" da última configuração aplicada.
const TAG = `${EXTENSION_ID}/effect-for`;
const SIG = `${EXTENSION_ID}/signature`;

function assetUrl(file: string) {
  // Caminho absoluto: o Owlbear carrega ícones fora do iframe da extensão.
  return new URL(file, document.baseURI).href;
}

// ---------- Desenho dos efeitos ----------

function effectProps(token: Image, cfg: AuraConfig, dpi: number, effectRotation: number) {
  const radius = Math.max(0.5, cfg.radius) * dpi;
  const center = tokenCenter(token, dpi);
  // A posição de um efeito é o canto superior esquerdo (girado em torno dele mesmo).
  const half = rotate({ x: radius, y: radius }, effectRotation);
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
      { name: "shape", value: cfg.shape === "square" ? 1 : 0 }
    ],
    sksl: shaderFor(cfg.preset)
  };
}

// Tudo que, se mudar, exige atualizar o efeito. A posição do item fica de fora:
// o próprio Owlbear move efeitos anexados junto com o item.
function signature(item: Image | Area, cfg: AuraConfig, dpi: number) {
  if (isImage(item)) {
    return JSON.stringify([cfg, dpi, item.scale, item.image.width, item.image.height, item.grid]);
  }
  const shape = isShape(item) ? [item.shapeType, item.width, item.height] : [hash(JSON.stringify(item.points))];
  return JSON.stringify([cfg, dpi, shape, item.scale, item.rotation]);
}

function hash(text: string) {
  let h = 5381;
  for (let i = 0; i < text.length; i++) h = ((h << 5) + h + text.charCodeAt(i)) | 0;
  return h;
}

type Props = ReturnType<typeof effectProps>;

// Para desenhos: a caixa do efeito envolve o contorno (mais a expansão) e o shader leva o contorno embutido.
async function areaProps(item: Area, cfg: AuraConfig, dpi: number): Promise<Props> {
  let center: { x: number; y: number } | undefined;
  if (isShape(item) && (item.shapeType === "CIRCLE" || item.shapeType === "HEXAGON")) {
    try { center = (await OBR.scene.items.getItemBounds([item.id])).center; } catch { /* usa a posição */ }
  }
  const geo = areaGeometry(areaPolygon(item, center), cfg, dpi);
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

function createEffect(item: Image | Area, cfg: AuraConfig, dpi: number, props: Props) {
  return buildEffect()
    .effectType("STANDALONE")
    .width(props.width)
    .height(props.height)
    .position(props.position)
    .attachedTo(item.id)
    .layer(props.layer)
    .blendMode(props.blendMode)
    .locked(true)
    .disableHit(true)
    .uniforms(props.uniforms)
    .sksl(props.sksl)
    .metadata({ [TAG]: item.id, [SIG]: signature(item, cfg, dpi) })
    .build();
}

async function sync() {
  const dpi = await OBR.scene.grid.getDpi();
  const items = await OBR.scene.items.getItems();

  const wanted = new Map<string, { item: Image | Area; cfg: AuraConfig }>();
  for (const item of items) {
    if (!isAuraTarget(item)) continue;
    const cfg = getAura(item);
    if (cfg) wanted.set(item.id, { item, cfg });
  }

  const existing = new Map<string, Item>();
  const stale: string[] = [];
  for (const local of await OBR.scene.local.getItems()) {
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
    const sig = signature(item, cfg, dpi);
    if (!effect) {
      const props = isImage(item) ? effectProps(item, cfg, dpi, 0) : await areaProps(item, cfg, dpi);
      toAdd.push(createEffect(item, cfg, dpi, props));
    } else if (effect.metadata[SIG] !== sig) {
      toUpdate.push({ effect, item, cfg, sig, area: isImage(item) ? undefined : await areaProps(item, cfg, dpi) });
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
        // Desenho: o contorno já está em coordenadas do mapa, então o efeito volta a rotação 0.
        if (u.area) fx.rotation = 0;
        const props = u.area ?? effectProps(u.item as Image, u.cfg, dpi, fx.rotation ?? 0);
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

// ---------- Início ----------

let unsubscribers: Array<() => void> = [];
function start() {
  stop();
  unsubscribers = [
    OBR.scene.items.onChange(() => queueSync()),
    OBR.scene.grid.onChange(() => queueSync())
  ];
  queueSync();
}
function stop() {
  for (const unsubscribe of unsubscribers) unsubscribe();
  unsubscribers = [];
}

OBR.onReady(async () => {
  setupContextMenu();
  // O script de fundo espelha a seleção do jogador para o painel (segunda fonte, caso a do painel falhe).
  OBR.player.onChange((player) => writeSharedSelection(player.selection ?? []));
  OBR.player.getSelection().then((ids) => writeSharedSelection(ids ?? [])).catch(() => {});
  OBR.scene.onReadyChange((ready) => (ready ? start() : stop()));
  if (await OBR.scene.isReady()) start();
});
