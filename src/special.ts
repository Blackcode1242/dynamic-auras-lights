// Efeitos especiais: acontecimentos visuais disparados pelo mestre (Revelação, Impacto, Manifestação, ...).
// Este arquivo não depende do Owlbear em tempo de execução: só tipos, a linha do tempo e a geometria.
import { isCurve, isImage, isShape } from "@owlbear-rodeo/sdk";
import type { Item } from "@owlbear-rodeo/sdk";
import { AREA_HELPERS, EXTENSION_ID, areaPolygon, simplifyPolygon, tokenCenter } from "./shared";
import type { Area, BlendModeName, Placement, Vec2 } from "./shared";

export const SPECIAL_RUNS_KEY = `${EXTENSION_ID}/specials`;   // metadados da cena: { runs: Run[] }
export const SPECIAL_DRAFT_KEY = `${EXTENSION_ID}/special-draft`;
export const SPECIAL_TAG = `${EXTENSION_ID}/special-run`;     // marca os efeitos locais criados por esta extensão
export const SPECIAL_STAGE = `${EXTENSION_ID}/special-stage`;
export const MAX_RUNS = 24;

export type SpecialId =
  | "reveal" | "impact" | "manifest"
  | "rupture" | "discharge" | "dissipation" | "corruption" | "crystal" | "residual"
  | "eclipse" | "seal" | "echo" | "distortion" | "vigil";

export type SpecialDef = {
  label: string;
  group: "event" | "phenomenon";
  hint: string;
  color: string;
  duration: number;   // segundos até o efeito chegar ao ápice (progresso 0 -> 1)
  persist: boolean;   // fica no mapa até o mestre desfazer
  hold: number;       // sem "permanecer": segundos que ele fica no ápice antes de sumir
};

export const SPECIALS: Record<SpecialId, SpecialDef> = {
  reveal:      { label: "Revelação",     group: "event",      hint: "Marcas que surgem aos poucos, como uma inscrição aparecendo.", color: "#9ad7ff", duration: 4,   persist: false, hold: 1.2 },
  impact:      { label: "Impacto",       group: "event",      hint: "Clarão e onda de choque rápidos.",                              color: "#ffd27a", duration: 1.2, persist: false, hold: 0.2 },
  manifest:    { label: "Manifestação",  group: "event",      hint: "Um portal ou fenômeno que se abre e permanece.",                color: "#8c7bff", duration: 3,   persist: true,  hold: 2 },
  rupture:     { label: "Ruptura",       group: "phenomenon", hint: "Rachaduras luminosas se espalhando.",                           color: "#ff4d6d", duration: 3,   persist: false, hold: 4 },
  discharge:   { label: "Descarga",      group: "phenomenon", hint: "Raios percorrendo o contorno do desenho ou a borda do token.",  color: "#9ad7ff", duration: 1.5, persist: false, hold: 1.5 },
  dissipation: { label: "Dissipação",    group: "phenomenon", hint: "Desfaz-se em partículas luminosas.",                            color: "#ffe9a8", duration: 3,   persist: false, hold: 0.4 },
  corruption:  { label: "Corrupção",     group: "phenomenon", hint: "Veias e manchas de energia que contaminam a região.",           color: "#a23bff", duration: 5,   persist: true,  hold: 2 },
  crystal:     { label: "Cristalização", group: "phenomenon", hint: "Facetas de cristal energético se formando.",                    color: "#9fe3ff", duration: 4,   persist: true,  hold: 2 },
  residual:    { label: "Rastro residual", group: "phenomenon", hint: "Vestígios de energia que se apagam devagar.",                 color: "#c0b0ff", duration: 4,   persist: false, hold: 0 },
  eclipse:     { label: "Eclipse",       group: "phenomenon", hint: "Disco escuro com coroa de luz na borda.",                       color: "#ffcf7a", duration: 3,   persist: true,  hold: 2 },
  seal:        { label: "Selo",          group: "phenomenon", hint: "Anéis de runas que se desenham ao redor.",                      color: "#ffd84a", duration: 3,   persist: true,  hold: 2 },
  echo:        { label: "Eco",           group: "phenomenon", hint: "Ondas que se repetem e tremem.",                                color: "#4fe3ff", duration: 3,   persist: false, hold: 0.3 },
  distortion:  { label: "Distorção",     group: "phenomenon", hint: "Ondulações que deformam o ar.",                                 color: "#ffffff", duration: 2,   persist: true,  hold: 2 },
  vigil:       { label: "Vigília",       group: "phenomenon", hint: "Olhos de luz que surgem e se movem.",                           color: "#ff3b3b", duration: 3,   persist: true,  hold: 2 }
};

export const SPECIAL_IDS = Object.keys(SPECIALS) as SpecialId[];

// ---- Configuração escolhida no painel ----
export type SpecialConfig = {
  effect: SpecialId;
  color: string;
  intensity: number;     // 0.2 a 1.6
  speed: number;         // velocidade dos movimentos em repetição
  duration: number;      // segundos
  persist: boolean;
  trail: boolean;        // ao terminar, deixa um rastro residual
  revealToken: boolean;  // token invisível: fica visível ao fim da fase de entrada
  radius: number;        // token: raio em quadrados (0 = ajustar à imagem); desenho: expansão
  blendMode: BlendModeName;
  placement: Placement;
};

export const DEFAULT_SPECIAL: SpecialConfig = {
  effect: "impact",
  color: SPECIALS.impact.color,
  intensity: 1,
  speed: 1,
  duration: SPECIALS.impact.duration,
  persist: SPECIALS.impact.persist,
  trail: false,
  revealToken: true,
  radius: 0,
  blendMode: "SRC_OVER",
  placement: "above"
};

const BLENDS = new Set<string>([
  "SRC_OVER", "SOFT_LIGHT", "HARD_LIGHT", "OVERLAY", "SCREEN", "COLOR_DODGE",
  "PLUS", "MULTIPLY", "COLOR_BURN", "DARKEN", "LIGHTEN", "DIFFERENCE"
]);

function clampNum(v: unknown, fallback: number, min: number, max: number) {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback;
}

export function normalizeSpecial(raw: unknown): SpecialConfig {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const effect: SpecialId = typeof r.effect === "string" && r.effect in SPECIALS ? (r.effect as SpecialId) : DEFAULT_SPECIAL.effect;
  const def = SPECIALS[effect];
  return {
    effect,
    color: typeof r.color === "string" && /^#[0-9a-fA-F]{6}$/.test(r.color) ? r.color : def.color,
    intensity: clampNum(r.intensity, 1, 0.2, 1.6),
    speed: clampNum(r.speed, 1, 0.2, 4),
    duration: clampNum(r.duration, def.duration, 0.5, 20),
    persist: typeof r.persist === "boolean" ? r.persist : def.persist,
    trail: r.trail === true,
    revealToken: r.revealToken !== false,
    radius: clampNum(r.radius, 0, 0, 30),
    blendMode: typeof r.blendMode === "string" && BLENDS.has(r.blendMode) ? (r.blendMode as BlendModeName) : "SRC_OVER",
    placement: r.placement === "below" ? "below" : "above"
  };
}

export function loadSpecialDraft(): SpecialConfig {
  try {
    return normalizeSpecial(JSON.parse(localStorage.getItem(SPECIAL_DRAFT_KEY) ?? "null"));
  } catch {
    return normalizeSpecial(null);
  }
}

export function saveSpecialDraft(cfg: SpecialConfig) {
  try {
    localStorage.setItem(SPECIAL_DRAFT_KEY, JSON.stringify(cfg));
  } catch {
    // sem armazenamento: o painel continua funcionando, só não lembra a escolha
  }
}

// ---- Disparo gravado nos metadados da cena ----
// A geometria é uma "foto" tirada na hora do disparo: assim os jogadores veem o efeito mesmo que o item
// de origem seja invisível para eles, e o efeito fica no lugar onde o acontecimento ocorreu.
export type RunGeometry =
  | { k: "circle"; x: number; y: number; r: number }
  | { k: "poly"; pts: number[]; open: boolean; spread: number };

export type Run = {
  id: string;
  itemId: string;
  effect: SpecialId;
  color: string;
  intensity: number;
  speed: number;
  duration: number;
  persist: boolean;
  trail: boolean;
  blendMode: BlendModeName;
  placement: Placement;
  dpi: number;
  geom: RunGeometry;
  startedAt: number;
  endedAt?: number;
  revealItemId?: string;
  revealed?: boolean;
};

export function readRuns(meta: unknown): Run[] {
  const root = (meta && typeof meta === "object" ? (meta as Record<string, unknown>)[SPECIAL_RUNS_KEY] : null) as { runs?: unknown } | null;
  if (!root || !Array.isArray(root.runs)) return [];
  const out: Run[] = [];
  for (const r of root.runs as Run[]) {
    if (!r || typeof r.id !== "string" || !(r.effect in SPECIALS) || !r.geom) continue;
    if (!Number.isFinite(r.startedAt) || !Number.isFinite(r.duration) || r.duration <= 0) continue;
    out.push(r);
  }
  return out;
}

export function newRunId() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
}

// Seed estável (0 a 100) para variar o desenho de cada disparo.
export function runSeed(id: string) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) % 9973;
  return (h % 1000) / 10;
}

// ---- Linha do tempo ----
export type RunStage = "main" | "trail" | "done";
export type RunState = { stage: RunStage; effect: SpecialId; progress: number; fade: number; animating: boolean; doneAt: number };

export const TRAIL_SECONDS = 4;
const fadeSeconds = (effect: SpecialId) => (effect === "impact" ? 0.5 : 1.2);

// Entrada (progress 0 -> 1 em "duration"), permanência (até "Desfazer" ou "hold"), saída (fade 1 -> 0) e, opcionalmente, rastro.
export function runState(run: Run, now: number): RunState {
  const def = SPECIALS[run.effect];
  const fadeDur = fadeSeconds(run.effect);
  const age = Math.max(0, (now - run.startedAt) / 1000);
  const progress = Math.min(1, age / run.duration);
  const endMs = run.endedAt ?? (run.persist ? Infinity : run.startedAt + (run.duration + def.hold) * 1000);
  const fadeEnd = endMs + fadeDur * 1000;
  const trailEnd = run.trail && run.effect !== "residual" ? fadeEnd + TRAIL_SECONDS * 1000 : fadeEnd;
  const doneAt = Number.isFinite(endMs) ? trailEnd : Infinity;

  if (now < endMs) return { stage: "main", effect: run.effect, progress, fade: 1, animating: progress < 1, doneAt };
  if (now < fadeEnd) {
    const fade = Math.max(0, 1 - (now - endMs) / 1000 / fadeDur);
    return { stage: "main", effect: run.effect, progress, fade, animating: true, doneAt };
  }
  if (now < trailEnd) {
    const tp = Math.min(1, (now - fadeEnd) / 1000 / TRAIL_SECONDS);
    return { stage: "trail", effect: "residual", progress: tp, fade: 1, animating: true, doneAt };
  }
  return { stage: "done", effect: run.effect, progress: 1, fade: 0, animating: false, doneAt };
}

// Momento em que o token invisível deve ser revelado (fim da fase de entrada). null = não revelar.
export function revealAt(run: Run): number | null {
  if (!run.revealItemId || run.revealed) return null;
  const at = run.startedAt + run.duration * 1000;
  if (run.endedAt !== undefined && run.endedAt < at) return null; // desfeito antes do ápice
  return at;
}

// Remove disparos terminados há mais de 3 s (e já revelados, quando havia revelação).
export function pruneRuns(runs: Run[], now: number): Run[] {
  return runs.filter((run) => {
    const st = runState(run, now);
    if (st.stage !== "done") return true;
    const pendingReveal = revealAt(run) !== null;
    return pendingReveal || now < st.doneAt + 3000;
  });
}

// ---- Geometria a partir do item selecionado ----
const STORE_POINTS = 24;

export function isSpecialTarget(item: Item) {
  return isImage(item) || isShape(item) || isCurve(item);
}

// center: só para formas circulares/hexagonais (vem de getItemBounds). dpi: pixels por quadrado.
export function snapshotGeometry(item: Item, cfg: SpecialConfig, dpi: number, center?: Vec2): RunGeometry | null {
  if (isImage(item)) {
    const c = tokenCenter(item, dpi);
    const dpiScale = dpi / item.grid.dpi;
    const w = item.image.width * dpiScale * Math.abs(item.scale.x);
    const h = item.image.height * dpiScale * Math.abs(item.scale.y);
    const auto = Math.min(w, h) / 2;
    const r = cfg.radius > 0 ? cfg.radius * dpi : auto;
    return { k: "circle", x: round1(c.x), y: round1(c.y), r: Math.max(0.25 * dpi, round1(r)) };
  }
  if (isShape(item) || isCurve(item)) {
    const poly = areaPolygon(item as Area, center);
    const pts = simplifyPolygon(poly, Math.max(1, dpi * 0.04), STORE_POINTS);
    const flat: number[] = [];
    for (const p of pts.length ? pts : poly.slice(0, 2)) flat.push(round1(p.x), round1(p.y));
    if (flat.length < 4) return null;
    return { k: "poly", pts: flat, open: isCurve(item), spread: round1(Math.max(0, cfg.radius) * dpi) };
  }
  return null;
}

export function makeRun(cfg: SpecialConfig, geom: RunGeometry, item: Item, dpi: number, now: number): Run {
  const run: Run = {
    id: newRunId(),
    itemId: item.id,
    effect: cfg.effect,
    color: cfg.color,
    intensity: cfg.intensity,
    speed: cfg.speed,
    duration: cfg.duration,
    persist: cfg.persist,
    trail: cfg.trail,
    blendMode: cfg.blendMode,
    placement: cfg.placement,
    dpi,
    geom,
    startedAt: now
  };
  if (cfg.revealToken && isImage(item) && item.visible === false) run.revealItemId = item.id;
  return run;
}

function round1(n: number) {
  return Math.round(n * 10) / 10;
}

// ---- Quadro do efeito: caixa no mapa e código do shader que descreve a região ----
export type RunFrame = { x: number; y: number; width: number; height: number; geometry: string };

const f1 = (n: number) => n.toFixed(1);
const f2 = (n: number) => n.toFixed(2);

// O código da região define: p (coordenada normalizada), sdf (<0 dentro), pdist (distância ao contorno),
// extent (raio do conjunto em unidades de p) e gw (largura do brilho em volta de linhas).
export function runFrame(run: Run): RunFrame {
  const g = run.geom;
  if (g.k === "circle") {
    const k = 1.3;
    const half = g.r * k;
    return {
      x: g.x - half, y: g.y - half, width: half * 2, height: half * 2,
      geometry: `
      vec2 p = (coord / size * 2.0 - 1.0) * ${f2(k)};
      float sdf = length(p) - 1.0;
      float pdist = abs(sdf);
      float extent = 1.0;
      float gw = 0.14;`
    };
  }
  const pts: Vec2[] = [];
  for (let i = 0; i + 1 < g.pts.length; i += 2) pts.push({ x: g.pts[i], y: g.pts[i + 1] });
  let working = pts;
  if (working.length < 3) {
    // Ponto ou traço reto: dá alguma área para o efeito.
    const xs = working.map((p) => p.x), ys = working.map((p) => p.y);
    const pad = run.dpi * 0.25;
    const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);
    working = [
      { x: minX - pad, y: minY - pad }, { x: maxX + pad, y: minY - pad },
      { x: maxX + pad, y: maxY + pad }, { x: minX - pad, y: maxY + pad }
    ];
  }
  const xs0 = working.map((p) => p.x), ys0 = working.map((p) => p.y);
  const bw = Math.max(...xs0) - Math.min(...xs0) + 2 * g.spread;
  const bh = Math.max(...ys0) - Math.min(...ys0) + 2 * g.spread;
  const unit = Math.min(6 * run.dpi, Math.max(0.5 * run.dpi, 0.5 * Math.min(bw, bh)));
  const margin = g.spread + 0.9 * unit + 2;
  const x = Math.min(...xs0) - margin;
  const y = Math.min(...ys0) - margin;
  const width = Math.max(...xs0) + margin - x;
  const height = Math.max(...ys0) + margin - y;
  const local = working.map((p) => ({ x: p.x - x, y: p.y - y }));
  const cx = width / 2, cy = height / 2;
  let far = 0;
  for (const p of local) far = Math.max(far, Math.hypot(p.x - cx, p.y - cy));
  const extent = Math.max(0.4, (far + g.spread) / unit);
  const open = g.open && working === pts && pts.length >= 2;
  const edges = local
    .map((a, i) => {
      const last = i === local.length - 1;
      const b = local[(i + 1) % local.length];
      const target = last && open ? "dummy" : "dist";
      return `edgeStep(c, vec2(${f1(a.x)}, ${f1(a.y)}), vec2(${f1(b.x)}, ${f1(b.y)}), ${target}, sgn);`;
    })
    .join("\n      ");
  const gw = Math.max(0.14, Math.min(1.2, g.spread / unit));
  return {
    x, y, width, height,
    geometry: `
      vec2 c = coord / size * vec2(${f1(width)}, ${f1(height)});
      float dist = 100000.0;
      float dummy = 100000.0;
      float sgn = 1.0;
      ${edges}
      float unit = ${f1(unit)};
      vec2 p = (c - vec2(${f1(width)}, ${f1(height)}) * 0.5) / unit;
      float sdf = (sgn * dist - ${f1(g.spread)}) / unit;
      float pdist = dist / unit;
      float extent = ${f2(extent)};
      float gw = ${f2(gw)};`
  };
}

export const REGION_HELPERS = AREA_HELPERS;
