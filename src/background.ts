import OBR, { buildEffect } from "@owlbear-rodeo/sdk";
import type { Image, Item, Layer } from "@owlbear-rodeo/sdk";
import {
  AURA_KEY, EDITOR_ID, EXTENSION_ID, getAura, hexToRgb, isToken, loadDraft,
  rotate, shaderFor, tokenCenter
} from "./shared";
import type { AuraConfig } from "./shared";

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

// Tudo que, se mudar, exige atualizar o efeito. A posição do token fica de fora:
// o próprio Owlbear move efeitos anexados junto com o token.
function signature(token: Image, cfg: AuraConfig, dpi: number) {
  return JSON.stringify([cfg, dpi, token.scale, token.image.width, token.image.height, token.grid]);
}

function createEffect(token: Image, cfg: AuraConfig, dpi: number) {
  const props = effectProps(token, cfg, dpi, 0);
  return buildEffect()
    .effectType("STANDALONE")
    .width(props.width)
    .height(props.height)
    .position(props.position)
    .attachedTo(token.id)
    .layer(props.layer)
    .blendMode(props.blendMode)
    .locked(true)
    .disableHit(true)
    .uniforms(props.uniforms)
    .sksl(props.sksl)
    .metadata({ [TAG]: token.id, [SIG]: signature(token, cfg, dpi) })
    .build();
}

async function sync() {
  const dpi = await OBR.scene.grid.getDpi();
  const items = await OBR.scene.items.getItems();

  const wanted = new Map<string, { token: Image; cfg: AuraConfig }>();
  for (const item of items) {
    if (!isToken(item)) continue;
    const cfg = getAura(item);
    if (cfg) wanted.set(item.id, { token: item, cfg });
  }

  const existing = new Map<string, Item>();
  const stale: string[] = [];
  for (const local of await OBR.scene.local.getItems()) {
    const tokenId = local.metadata[TAG];
    if (typeof tokenId !== "string") continue;
    if (wanted.has(tokenId) && !existing.has(tokenId)) existing.set(tokenId, local);
    else stale.push(local.id); // token sem aura, apagado ou efeito duplicado
  }

  if (stale.length) await OBR.scene.local.deleteItems(stale);

  const toAdd: Item[] = [];
  const toUpdate: { effect: Item; token: Image; cfg: AuraConfig; sig: string }[] = [];
  for (const [tokenId, { token, cfg }] of wanted) {
    const effect = existing.get(tokenId);
    const sig = signature(token, cfg, dpi);
    if (!effect) toAdd.push(createEffect(token, cfg, dpi));
    else if (effect.metadata[SIG] !== sig) toUpdate.push({ effect, token, cfg, sig });
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
        const props = effectProps(u.token, u.cfg, dpi, fx.rotation ?? 0);
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
  try {
    await OBR.popover.close(EDITOR_ID);
  } catch (e) {
    // Ignora se não estiver aberto
  }

  const [width, height] = await Promise.all([
    OBR.viewport.getWidth(),
    OBR.viewport.getHeight()
  ]);

  await OBR.popover.open({
    id: EDITOR_ID,
    url: assetUrl("index.html"),
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

function setupContextMenu() {
  OBR.contextMenu.create({
    id: `${EXTENSION_ID}/enable`,
    icons: [{
      icon: assetUrl("aura-on.svg"),
      label: "Ativar aura",
      filter: { every: [...imageNotMap, noAura], permissions: ["UPDATE"] }
    }],
    async onClick(context) {
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
    async onClick() {
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
  OBR.scene.onReadyChange((ready) => (ready ? start() : stop()));
  if (await OBR.scene.isReady()) start();
});
