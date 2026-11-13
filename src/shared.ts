import { isCurve, isImage, isShape } from "@owlbear-rodeo/sdk";
import type { Curve, Image, Item, Shape as ObrShape } from "@owlbear-rodeo/sdk";
import type { Schedule } from "./clock";

export const EXTENSION_ID = "com.example.dynamic-auras-lights";
// A aura de cada token fica guardada nos metadados dele (sincroniza com a sala e com a cena salva).
export const AURA_KEY = `${EXTENSION_ID}/aura`;
export const DRAFT_KEY = `${EXTENSION_ID}/draft`;
export const EDITOR_ID = `${EXTENSION_ID}/editor`;
export const VERSION = "1.6.0";
// false = só o painel do ícone da barra (manifest). true = também abre o painel lateral (popover) pelo menu.
// Desligado por padrão: foi depois do painel lateral que a seleção parou de ser identificada.
export const USE_SIDEBAR = false;
// Ponte entre o script de fundo e o painel (mesma origem): o fundo grava a seleção aqui.
export const SEL_KEY = `${EXTENSION_ID}/selection`;
export function writeSharedSelection(ids: string[]) {
  try { localStorage.setItem(SEL_KEY, JSON.stringify(ids)); } catch { /* ignora */ }
}
export function readSharedSelection(): string[] {
  try {
    const v = JSON.parse(localStorage.getItem(SEL_KEY) ?? "[]");
    return Array.isArray(v) ? v.filter((x) => typeof x === "string") : [];
  } catch { return []; }
}

export type StyleName = "glow" | "torch" | "ghost" | "flame" | "ring" | "ripple" | "beams" | "electric" | "sparkle" | "bubbles" | "orbit";
export type MotionName =
  | "static" | "torch" | "candle" | "faulty" | "powercut" | "neon" | "strobe"
  | "pulse" | "heartbeat" | "lightning" | "spectral" | "electric";
export type Group = "light" | "aura" | "condition";
export type Shape = "circle" | "square" | "cone" | "line";
export type FogMode = "off" | "primary" | "secondary" | "auxiliary";
export type Quality = "high" | "medium" | "low";
export type { Schedule } from "./clock";
export type Placement = "below" | "above";
export type BlendModeName =
  | "SRC_OVER" | "SOFT_LIGHT" | "HARD_LIGHT" | "OVERLAY" | "SCREEN" | "COLOR_DODGE"
  | "PLUS" | "MULTIPLY" | "COLOR_BURN" | "DARKEN" | "LIGHTEN" | "DIFFERENCE";

export type PresetDef = {
  label: string; group: Group; color: string; intensity: number; speed: number;
  softness: number; style: StyleName; motion: MotionName; radius?: number;
};

export const PRESETS = {
  // ---- Iluminação ----
  torch:     { label: "Tocha",              group: "light", color: "#ff9b42", intensity: 0.95, speed: 1.8, softness: 0.70, style: "torch",    motion: "torch" },
  candle:    { label: "Vela",               group: "light", color: "#ffcf7a", intensity: 0.90, speed: 1.4, softness: 0.85, style: "glow",     motion: "candle" },
  fire:      { label: "Fogueira",           group: "light", color: "#ff7a1a", intensity: 1.00, speed: 1.6, softness: 0.75, style: "flame",    motion: "torch" },
  faulty:    { label: "Lâmpada defeituosa", group: "light", color: "#fff2c4", intensity: 1.00, speed: 5.0, softness: 0.55, style: "glow",     motion: "faulty" },
  powercut:  { label: "Queda de energia",   group: "light", color: "#fff2c4", intensity: 1.00, speed: 1.0, softness: 0.55, style: "glow",     motion: "powercut" },
  neon:      { label: "Neon",               group: "light", color: "#ff3df2", intensity: 1.10, speed: 1.0, softness: 0.45, style: "glow",     motion: "neon" },
  lightning: { label: "Relâmpago",          group: "light", color: "#cfe4ff", intensity: 1.20, speed: 1.2, softness: 0.60, style: "glow",     motion: "lightning" },
  static:    { label: "Luz fixa",           group: "light", color: "#ffe2a1", intensity: 0.85, speed: 0,   softness: 0.60, style: "glow",     motion: "static" },
  // ---- Auras ----
  arcane:    { label: "Arcana",             group: "aura",  color: "#55aaff", intensity: 0.90, speed: 1.3, softness: 0.65, style: "glow",     motion: "pulse" },
  divine:    { label: "Divina",             group: "aura",  color: "#ffe8a3", intensity: 0.95, speed: 0.7, softness: 0.80, style: "glow",     motion: "pulse" },
  spectral:  { label: "Espectral",          group: "aura",  color: "#71e5b4", intensity: 0.85, speed: 1.1, softness: 0.75, style: "ghost",    motion: "spectral" },
  pulse:     { label: "Pulsante",           group: "aura",  color: "#8c7bff", intensity: 0.95, speed: 1.5, softness: 0.65, style: "glow",     motion: "pulse" },
  heartbeat: { label: "Batimento",          group: "aura",  color: "#ff2a3d", intensity: 1.00, speed: 1.4, softness: 0.75, style: "glow",     motion: "heartbeat" },
  emergency: { label: "Emergência",         group: "aura",  color: "#ff3030", intensity: 1.00, speed: 2.8, softness: 0.40, style: "glow",     motion: "strobe" },
  beacon:    { label: "Giroflex (feixes)",  group: "aura",  color: "#ff3b3b", intensity: 1.10, speed: 1.5, softness: 0.50, style: "beams",    motion: "static" },
  sonar:     { label: "Sonar (ondas)",      group: "aura",  color: "#4fe3ff", intensity: 1.00, speed: 1.0, softness: 0.70, style: "ripple",   motion: "static" },
  shield:    { label: "Escudo (anel)",      group: "aura",  color: "#7ad0ff", intensity: 1.00, speed: 0.8, softness: 0.35, style: "ring",     motion: "pulse" },
  electric:  { label: "Elétrica",           group: "aura",  color: "#9ad7ff", intensity: 1.10, speed: 1.5, softness: 0.50, style: "electric", motion: "electric" },
  sparkle:   { label: "Cintilante",         group: "aura",  color: "#ffe9a8", intensity: 1.00, speed: 1.0, softness: 0.70, style: "sparkle",  motion: "static" },
  // ---- Condições (raio pequeno, pensado para ficar em volta do token) ----
  poison:        { label: "Envenenado",     group: "condition", color: "#7ddc4a", intensity: 0.95, speed: 1.0, softness: 0.70, style: "bubbles", motion: "pulse",     radius: 1.4 },
  bleeding:      { label: "Sangrando",      group: "condition", color: "#d1141f", intensity: 1.00, speed: 1.2, softness: 0.70, style: "glow",    motion: "heartbeat", radius: 1.3 },
  burning:       { label: "Em chamas",      group: "condition", color: "#ff7a1a", intensity: 1.00, speed: 1.8, softness: 0.75, style: "flame",   motion: "torch",     radius: 1.5 },
  frozen:        { label: "Congelado",      group: "condition", color: "#9fe3ff", intensity: 0.95, speed: 0.8, softness: 0.60, style: "sparkle", motion: "static",    radius: 1.4 },
  blessed:       { label: "Abençoado",      group: "condition", color: "#ffe08a", intensity: 0.95, speed: 0.9, softness: 0.80, style: "sparkle", motion: "pulse",     radius: 1.5 },
  cursed:        { label: "Amaldiçoado",    group: "condition", color: "#7b3fe4", intensity: 0.90, speed: 1.0, softness: 0.75, style: "ghost",   motion: "spectral",  radius: 1.5 },
  charmed:       { label: "Enfeitiçado",    group: "condition", color: "#ff5fb0", intensity: 0.95, speed: 1.0, softness: 0.80, style: "glow",    motion: "heartbeat", radius: 1.4 },
  frightened:    { label: "Amedrontado",    group: "condition", color: "#8f7bd6", intensity: 0.90, speed: 2.2, softness: 0.60, style: "ghost",   motion: "heartbeat", radius: 1.4 },
  stunned:       { label: "Atordoado",      group: "condition", color: "#ffd84a", intensity: 1.00, speed: 1.0, softness: 0.60, style: "orbit",   motion: "static",    radius: 1.2 },
  paralyzed:     { label: "Paralisado",     group: "condition", color: "#ffe34d", intensity: 1.00, speed: 0.8, softness: 0.40, style: "ring",    motion: "static",    radius: 1.3 },
  concentrating: { label: "Concentrando",   group: "condition", color: "#66a8ff", intensity: 0.90, speed: 0.7, softness: 0.50, style: "ring",    motion: "pulse",     radius: 1.4 },
  invisible:     { label: "Invisível",      group: "condition", color: "#cfe9ff", intensity: 0.50, speed: 0.9, softness: 0.85, style: "ghost",   motion: "spectral",  radius: 1.3 }
} satisfies Record<string, PresetDef>;

export type Preset = keyof typeof PRESETS;

export const GROUP_LABELS: Record<Group, string> = { light: "Iluminação", aura: "Auras", condition: "Condições" };

export const BLEND_MODES: { value: BlendModeName; label: string }[] = [
  { value: "SRC_OVER",    label: "Normal" },
  { value: "SOFT_LIGHT",  label: "Soft Light (luz suave)" },
  { value: "HARD_LIGHT",  label: "Hard Light (luz intensa)" },
  { value: "OVERLAY",     label: "Overlay (sobreposição)" },
  { value: "SCREEN",      label: "Screen (tela)" },
  { value: "COLOR_DODGE", label: "Color Dodge" },
  { value: "PLUS",        label: "Plus (aditivo)" },
  { value: "MULTIPLY",    label: "Multiply (multiplicar)" },
  { value: "COLOR_BURN",  label: "Color Burn" },
  { value: "DARKEN",      label: "Darken (escurecer)" },
  { value: "LIGHTEN",     label: "Lighten (clarear)" },
  { value: "DIFFERENCE",  label: "Difference (diferença)" }
];

export type AuraConfig = {
  preset: Preset;
  color: string;
  gradientEnabled: boolean;
  gradientColor: string;
  gradientAngle: number;
  radius: number;
  intensity: number;
  speed: number;
  softness: number;
  shape: Shape;
  placement: Placement;
  blendMode: BlendModeName;
  angle: number;      // abertura total do cone, em graus
  width: number;      // largura da linha, em quadrados
  direction: number;  // direção do cone/linha em relação ao topo do token, em graus (horário)
  fog: FogMode;       // luz do Dynamic Fog (só para tokens)
  schedule: Schedule; // quando acende, se o Dynamic Day Cycle estiver ativo na cena
};

export const DEFAULT_CONFIG: AuraConfig = {
  preset: "torch",
  color: PRESETS.torch.color,
  gradientEnabled: false,
  gradientColor: "#ffffff",
  gradientAngle: 90,
  radius: 3,
  intensity: PRESETS.torch.intensity,
  speed: PRESETS.torch.speed,
  softness: PRESETS.torch.softness,
  shape: "circle",
  placement: "below",
  blendMode: "SRC_OVER",
  angle: 60,
  width: 1,
  direction: 0,
  fog: "off",
  schedule: "always"
};

function num(value: unknown, fallback: number, min: number, max: number) {
  const n = typeof value === "number" && Number.isFinite(value) ? value : fallback;
  return Math.min(max, Math.max(min, n));
}

// Aceita qualquer coisa vinda dos metadados e devolve uma configuração válida.
export function normalizeConfig(raw: unknown): AuraConfig {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const preset = typeof r.preset === "string" && r.preset in PRESETS ? (r.preset as Preset) : DEFAULT_CONFIG.preset;
  const color = typeof r.color === "string" && /^#[0-9a-fA-F]{6}$/.test(r.color) ? r.color : PRESETS[preset].color;
  const shape: Shape = r.shape === "square" || r.shape === "cone" || r.shape === "line" ? r.shape : "circle";
  const fog: FogMode = r.fog === "primary" || r.fog === "secondary" || r.fog === "auxiliary" ? r.fog : "off";
  const placement: Placement = r.placement === "above" ? "above" : "below";
  const blendMode = BLEND_MODES.some((m) => m.value === r.blendMode) ? (r.blendMode as BlendModeName) : "SRC_OVER";
  return {
    preset,
    color,
    gradientEnabled: r.gradientEnabled === true,
    gradientColor: typeof r.gradientColor === "string" && /^#[0-9a-fA-F]{6}$/.test(r.gradientColor) ? r.gradientColor : DEFAULT_CONFIG.gradientColor,
    gradientAngle: num(r.gradientAngle, DEFAULT_CONFIG.gradientAngle, 0, 360),
    radius: num(r.radius, DEFAULT_CONFIG.radius, 0, 20),
    intensity: num(r.intensity, PRESETS[preset].intensity, 0.1, 1.5),
    speed: num(r.speed, PRESETS[preset].speed, 0, 8),
    softness: num(r.softness, PRESETS[preset].softness, 0, 1),
    shape,
    placement,
    blendMode,
    angle: num(r.angle, DEFAULT_CONFIG.angle, 10, 170),
    width: num(r.width, DEFAULT_CONFIG.width, 0.1, 10),
    direction: num(r.direction, DEFAULT_CONFIG.direction, -180, 180),
    fog,
    schedule: r.schedule === "night" || r.schedule === "day" ? r.schedule : "always"
  };
}

export function isDirectional(cfg: AuraConfig) {
  return cfg.shape === "cone" || cfg.shape === "line";
}

export function loadDraft(): AuraConfig {
  try { return normalizeConfig(JSON.parse(localStorage.getItem(DRAFT_KEY) ?? "null")); }
  catch { return { ...DEFAULT_CONFIG }; }
}
export function saveDraft(config: AuraConfig) {
  try { localStorage.setItem(DRAFT_KEY, JSON.stringify(config)); } catch { /* ignora */ }
}

// ---- Configurações deste computador (qualidade e calibração do fog) ----
// Ficam no navegador e não na cena: o desempenho depende da máquina de cada pessoa.
export const SETTINGS_KEY = `${EXTENSION_ID}/settings`;
export type Settings = { quality: Quality; fogOffset: number };
export const DEFAULT_SETTINGS: Settings = { quality: "high", fogOffset: 0 };

export function getSettings(): Settings {
  try {
    const raw = JSON.parse(localStorage.getItem(SETTINGS_KEY) ?? "null") ?? {};
    return {
      quality: raw.quality === "medium" || raw.quality === "low" ? raw.quality : "high",
      fogOffset: num(raw.fogOffset, 0, -180, 180)
    };
  } catch { return { ...DEFAULT_SETTINGS }; }
}
export function setSettings(patch: Partial<Settings>) {
  try { localStorage.setItem(SETTINGS_KEY, JSON.stringify({ ...getSettings(), ...patch })); } catch { /* ignora */ }
}

// ---- Presets salvos pelo usuário ----
export const SAVED_KEY = `${EXTENSION_ID}/saved-presets`;
export type SavedPreset = { id: string; name: string; config: AuraConfig };

export function loadSavedPresets(): SavedPreset[] {
  try {
    const raw = JSON.parse(localStorage.getItem(SAVED_KEY) ?? "[]");
    return sanitizeSaved(raw);
  } catch { return []; }
}
function sanitizeSaved(raw: unknown): SavedPreset[] {
  if (!Array.isArray(raw)) return [];
  const out: SavedPreset[] = [];
  for (const r of raw) {
    if (!r || typeof r !== "object") continue;
    const name = typeof (r as any).name === "string" ? (r as any).name.trim().slice(0, 40) : "";
    if (!name) continue;
    const id = typeof (r as any).id === "string" && (r as any).id ? (r as any).id : Math.random().toString(36).slice(2, 9);
    out.push({ id, name, config: normalizeConfig((r as any).config) });
  }
  return out;
}
export function storeSavedPresets(list: SavedPreset[]) {
  try { localStorage.setItem(SAVED_KEY, JSON.stringify(list)); } catch { /* ignora */ }
}
// Salva (ou substitui, se o nome já existir).
export function savePreset(name: string, config: AuraConfig): SavedPreset[] {
  const clean = name.trim().slice(0, 40) || "Preset";
  const list = loadSavedPresets();
  const found = list.find((p) => p.name.toLowerCase() === clean.toLowerCase());
  if (found) { found.config = { ...config }; found.name = clean; }
  else list.push({ id: Date.now().toString(36) + Math.random().toString(36).slice(2, 5), name: clean, config: { ...config } });
  storeSavedPresets(list);
  return list;
}
export function deletePreset(id: string): SavedPreset[] {
  const list = loadSavedPresets().filter((p) => p.id !== id);
  storeSavedPresets(list);
  return list;
}
export function exportPresets(): string {
  return JSON.stringify({ app: "dynamic-auras-lights", presets: loadSavedPresets() }, null, 1);
}
// Junta os presets do texto com os atuais. Devolve quantos foram importados (0 se o texto for inválido).
export function importPresets(text: string): number {
  try {
    const parsed = JSON.parse(text);
    const incoming = sanitizeSaved(Array.isArray(parsed) ? parsed : parsed?.presets);
    let list = loadSavedPresets();
    for (const p of incoming) {
      list = list.filter((x) => x.name.toLowerCase() !== p.name.toLowerCase());
      list.push({ ...p, id: Date.now().toString(36) + Math.random().toString(36).slice(2, 5) });
    }
    storeSavedPresets(list);
    return incoming.length;
  } catch { return 0; }
}

// ---- Status do script de fundo (aparece no Diagnóstico do painel) ----
export const STATUS_KEY = `${EXTENSION_ID}/status`;
export function writeStatus(patch: Record<string, string>) {
  try {
    const cur = JSON.parse(localStorage.getItem(STATUS_KEY) ?? "{}");
    localStorage.setItem(STATUS_KEY, JSON.stringify({ ...cur, ...patch }));
  } catch { /* ignora */ }
}
export function readStatus(): Record<string, string> {
  try { return JSON.parse(localStorage.getItem(STATUS_KEY) ?? "{}"); } catch { return {}; }
}

// ---- Tokens ----
// Mesmo critério do menu de contexto: qualquer imagem que não seja o mapa.
export function isToken(item: Item): item is Image {
  return isImage(item) && item.layer !== "MAP";
}

// ---- Desenhos (luz ambiente) ----
// Formas e curvas desenhadas no mapa também podem ter aura: a luz preenche o contorno do desenho.
export type Vec2 = { x: number; y: number };
export type Area = ObrShape | Curve;
export const HIDE_KEY = `${EXTENSION_ID}/hidden-drawing`;

export function isArea(item: Item): item is Area {
  return isShape(item) || isCurve(item);
}
export function isAuraTarget(item: Item): item is Image | Area {
  return isToken(item) || isArea(item);
}

// Esconde o desenho (opacidade 0) guardando os valores antigos para poder restaurar.
export function hideDrawing(item: Area) {
  const style = item.style as any;
  if (!item.metadata[HIDE_KEY]) {
    item.metadata[HIDE_KEY] = { fill: style.fillOpacity, stroke: style.strokeOpacity };
  }
  style.fillOpacity = 0;
  style.strokeOpacity = 0;
}
export function showDrawing(item: Area) {
  const prev = item.metadata[HIDE_KEY] as { fill?: number; stroke?: number } | undefined;
  if (!prev) return;
  const style = item.style as any;
  style.fillOpacity = typeof prev.fill === "number" ? prev.fill : 1;
  style.strokeOpacity = typeof prev.stroke === "number" ? prev.stroke : 1;
  delete item.metadata[HIDE_KEY];
}
export function isHidden(item: Item) {
  return Boolean(item.metadata?.[HIDE_KEY]);
}

// Contorno do desenho em coordenadas do mapa (posição + rotação + escala já aplicadas).
// "center" (opcional) é o centro real da forma, vindo de OBR.scene.items.getItemBounds:
// usado em círculo/hexágono para não depender de onde o Owlbear ancora a posição.
export function areaPolygon(item: Area, center?: Vec2): Vec2[] {
  const sx = item.scale?.x ?? 1;
  const sy = item.scale?.y ?? 1;
  const toWorld = (pt: Vec2): Vec2 => {
    const r = rotate({ x: pt.x * sx, y: pt.y * sy }, item.rotation ?? 0);
    return { x: item.position.x + r.x, y: item.position.y + r.y };
  };
  if (isCurve(item)) return item.points.map(toWorld);

  const w = item.width;
  const h = item.height;
  switch (item.shapeType) {
    case "CIRCLE":
    case "HEXAGON": {
      const n = item.shapeType === "CIRCLE" ? 36 : 6;
      const c = center ?? item.position;
      const rx = (w * Math.abs(sx)) / 2;
      const ry = (h * Math.abs(sy)) / 2;
      const pts: Vec2[] = [];
      for (let k = 0; k < n; k++) {
        const a = (k / n) * Math.PI * 2 - Math.PI / 2;
        const r = rotate({ x: Math.cos(a) * rx, y: Math.sin(a) * ry }, item.rotation ?? 0);
        pts.push({ x: c.x + r.x, y: c.y + r.y });
      }
      return pts;
    }
    case "TRIANGLE":
      return [{ x: w / 2, y: 0 }, { x: w, y: h }, { x: 0, y: h }].map(toWorld);
    default:
      return [{ x: 0, y: 0 }, { x: w, y: 0 }, { x: w, y: h }, { x: 0, y: h }].map(toWorld);
  }
}

function distToSegment(p: Vec2, a: Vec2, b: Vec2) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len2 = dx * dx + dy * dy;
  const t = len2 > 0 ? Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / len2)) : 0;
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
}

// Ramer-Douglas-Peucker: reduz um traço à mão livre a poucos pontos (o shader tem custo por ponto).
function rdp(pts: Vec2[], eps: number): Vec2[] {
  if (pts.length < 3) return pts.slice();
  const keep = new Array<boolean>(pts.length).fill(false);
  keep[0] = keep[pts.length - 1] = true;
  const stack: [number, number][] = [[0, pts.length - 1]];
  while (stack.length) {
    const [a, b] = stack.pop()!;
    let maxD = 0;
    let idx = -1;
    for (let i = a + 1; i < b; i++) {
      const d = distToSegment(pts[i], pts[a], pts[b]);
      if (d > maxD) { maxD = d; idx = i; }
    }
    if (idx >= 0 && maxD > eps) { keep[idx] = true; stack.push([a, idx], [idx, b]); }
  }
  return pts.filter((_, i) => keep[i]);
}

export const MAX_AREA_POINTS = 48;

export function simplifyPolygon(points: Vec2[], tolerance: number, maxPoints = MAX_AREA_POINTS): Vec2[] {
  let pts = points.slice();
  // Se o traço termina onde começou, tira o ponto repetido.
  if (pts.length > 1) {
    const f = pts[0];
    const l = pts[pts.length - 1];
    if (Math.hypot(f.x - l.x, f.y - l.y) < 0.5) pts.pop();
  }
  let eps = tolerance;
  let out = rdp(pts, eps);
  for (let i = 0; i < 14 && out.length > maxPoints; i++) {
    eps *= 1.5;
    out = rdp(pts, eps);
  }
  return out;
}

export type AreaGeometry = { x: number; y: number; width: number; height: number; sksl: string };

// Calcula onde fica o efeito (caixa que envolve o desenho + a expansão) e o shader com o contorno embutido.
export function areaGeometry(polygon: Vec2[], cfg: AuraConfig, dpi: number, quality: Quality = "high"): AreaGeometry {
  const maxPts = quality === "high" ? MAX_AREA_POINTS : quality === "medium" ? 24 : 12;
  let pts = simplifyPolygon(polygon, Math.max(1, dpi * 0.04), maxPts);
  if (pts.length < 3) {
    // Linha ou ponto: usa a caixa do desenho para ainda ter uma área.
    const xs = polygon.map((p) => p.x);
    const ys = polygon.map((p) => p.y);
    const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);
    const pad = dpi * 0.25;
    pts = [
      { x: minX - pad, y: minY - pad }, { x: maxX + pad, y: minY - pad },
      { x: maxX + pad, y: maxY + pad }, { x: minX - pad, y: maxY + pad }
    ];
  }
  const spread = Math.max(0, cfg.radius) * dpi;
  const margin = spread + 2;
  const xs = pts.map((p) => p.x);
  const ys = pts.map((p) => p.y);
  const x = Math.min(...xs) - margin;
  const y = Math.min(...ys) - margin;
  const width = Math.max(...xs) + margin - x;
  const height = Math.max(...ys) + margin - y;
  const local = pts.map((p) => ({ x: p.x - x, y: p.y - y }));
  // Escala usada nos efeitos de borda: metade do menor lado, entre 0,5 e 6 quadrados.
  const unit = Math.min(6 * dpi, Math.max(0.5 * dpi, 0.5 * Math.min(width, height)));
  return { x, y, width, height, sksl: shaderForArea(cfg.preset, local, width, height, spread, unit, quality) };
}

export function getAura(item: Item): AuraConfig | null {
  const raw = item.metadata?.[AURA_KEY];
  return raw && typeof raw === "object" ? normalizeConfig(raw) : null;
}

export function hexToRgb(hex: string) {
  const value = hex.replace("#", "");
  return {
    x: parseInt(value.slice(0, 2), 16) / 255,
    y: parseInt(value.slice(2, 4), 16) / 255,
    z: parseInt(value.slice(4, 6), 16) / 255
  };
}

export function rotate(v: { x: number; y: number }, degrees: number) {
  const rad = (degrees * Math.PI) / 180;
  return {
    x: v.x * Math.cos(rad) - v.y * Math.sin(rad),
    y: v.x * Math.sin(rad) + v.y * Math.cos(rad)
  };
}

// Centro visual da imagem do token em coordenadas do mapa.
// A "position" de uma imagem é o ponto de ancoragem (grid.offset), não o centro nem o canto.
export function tokenCenter(token: Image, dpi: number) {
  const dpiScale = dpi / token.grid.dpi;
  const width = token.image.width * dpiScale * token.scale.x;
  const height = token.image.height * dpiScale * token.scale.y;
  const offsetX = (token.grid.offset.x / token.image.width) * width;
  const offsetY = (token.grid.offset.y / token.image.height) * height;
  const v = rotate({ x: width / 2 - offsetX, y: height / 2 - offsetY }, token.rotation);
  return { x: token.position.x + v.x, y: token.position.y + v.y };
}

// ---- Shader ----
// Animações (0 = apagado, 1 = aceso; pode passar de 1 para dar clarão).
const MOTION_FUNCTIONS = `
  float hash(float n) {
    n = mod(n, 4096.0);
    float x = fract(n * 0.1031);
    x *= x + 33.33;
    x *= x + x;
    return fract(x);
  }
  float hash2(vec2 q) { return hash(q.x + q.y * 57.0); }
  float snoise(float n) {
    float i = floor(n);
    return mix(hash(i), hash(i + 1.0), smoothstep(0.0, 1.0, fract(n)));
  }
  float vnoise(vec2 q) {
    vec2 i = floor(q);
    vec2 f = fract(q);
    f = f * f * (3.0 - 2.0 * f);
    float a = hash2(i);
    float b = hash2(i + vec2(1.0, 0.0));
    float c = hash2(i + vec2(0.0, 1.0));
    float d = hash2(i + vec2(1.0, 1.0));
    return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
  }

  // Tocha: respiração lenta + ruído rápido. ~0.35 a ~1.1
  float torchMotion(float t, float sp) {
    float k = t * sp;
    float slow = 0.5 + 0.5 * sin(k * 3.1 + sin(k * 1.7) * 2.0);
    return 0.35 + 0.30 * slow + 0.45 * snoise(k * 6.0);
  }

  // Vela: oscilação mais calma, sempre acesa.
  float candleMotion(float t, float sp) {
    float k = t * sp;
    return 0.62 + 0.14 * sin(k * 2.3) + 0.24 * snoise(k * 4.0 + 5.0);
  }

  // Lâmpada defeituosa: trechos estáveis, trechos tremendo (liga/desliga seco) e apagões. Clarão ao religar.
  float faultyMotion(float t, float sp) {
    float k = t * sp;
    float slot = floor(k * 0.8);
    float r1 = hash(slot);
    float r2 = hash(floor(k * 3.0) + slot * 17.0);
    float dead = 1.0 - step(0.12, r1);
    float bad = 1.0 - step(0.50, r1);
    float stutter = step(0.45, r2);
    float on = mix(1.0, stutter, bad) * (1.0 - dead);
    float local = fract(k * 3.0);
    float kick = 1.0 + 0.45 * (1.0 - smoothstep(0.0, 0.3, local)) * bad;
    return on * kick;
  }

  // Queda de energia: acesa -> tremida -> apaga -> tremida -> volta com clarão.
  float powercutMotion(float t, float sp) {
    float c = fract(t * sp * 0.12);
    float burst1 = step(0.55, c) * (1.0 - step(0.70, c));
    float off    = step(0.70, c) * (1.0 - step(0.88, c));
    float burst2 = step(0.88, c) * (1.0 - step(0.95, c));
    float st = step(0.5, hash(floor(t * 10.0)));
    float on = mix(1.0, st, burst1 + burst2);
    on = mix(on, 0.0, off);
    float flash = 1.0 + 0.5 * (1.0 - smoothstep(0.95, 0.99, c)) * step(0.95, c);
    return on * flash;
  }

  // Neon: zumbido constante, com falhas rápidas de vez em quando.
  float neonMotion(float t, float sp) {
    float k = t * sp;
    float hum = 0.92 + 0.08 * sin(t * 60.0);
    float bad = step(0.80, hash(floor(k * 0.6)));
    float drop = bad * step(0.5, hash(floor(k * 18.0) + 31.0));
    return hum * (1.0 - drop);
  }

  // Emergência: duplo clarão seguido de escuridão total.
  float strobeMotion(float t, float sp) {
    float c = fract(t * sp * 0.5);
    float a = step(c, 0.14);
    float b = step(0.24, c) * step(c, 0.38);
    return clamp(a + b, 0.0, 1.0);
  }

  // Pulso: respira de ~8% até 100%.
  float pulseMotion(float t, float sp) {
    float s = 0.5 + 0.5 * sin(t * sp * 6.2831853);
    return 0.08 + 0.92 * s;
  }

  // Batimento: "tum-tum" e silêncio.
  float heartbeatMotion(float t, float sp) {
    float c = fract(t * sp * 0.8);
    float x1 = (c - 0.10) / 0.05;
    float x2 = (c - 0.32) / 0.07;
    float beat = exp(-x1 * x1) + 0.75 * exp(-x2 * x2);
    return 0.10 + 0.90 * clamp(beat, 0.0, 1.0);
  }

  // Relâmpago: quase escuro, com descargas duplas em momentos aleatórios.
  float lightningMotion(float t, float sp) {
    float k = t * sp * 0.5;
    float slot = floor(k);
    float local = fract(k);
    float has = step(0.40, hash(slot));
    float at = 0.15 + 0.5 * hash(slot + 7.0);
    float d1 = local - at;
    float d2 = d1 - 0.12;
    float f1 = step(0.0, d1) * exp(-max(d1, 0.0) * 26.0);
    float f2 = step(0.0, d2) * exp(-max(d2, 0.0) * 20.0) * 0.8;
    return 0.04 + has * clamp(f1 + f2, 0.0, 1.0) * 1.6;
  }

  // Espectral: oscilação irregular e visível.
  float spectralMotion(float t, float sp) {
    float k = t * sp;
    return 0.55 + 0.25 * sin(k * 2.1) + 0.20 * sin(k * 4.7 + 1.3);
  }

  // Elétrica: brilho aleatório em degraus, com quedas.
  float electricMotion(float t, float sp) {
    float n = floor(t * sp * 14.0);
    float on = step(0.12, hash(n));
    return on * (0.55 + 0.45 * hash(n + 3.0));
  }
`;

const MOTION_EXPR: Record<MotionName, string> = {
  static: "1.0",
  torch: "torchMotion(t, sp)",
  candle: "candleMotion(t, sp)",
  faulty: "faultyMotion(t, sp)",
  powercut: "powercutMotion(t, sp)",
  neon: "neonMotion(t, sp)",
  strobe: "strobeMotion(t, sp)",
  pulse: "pulseMotion(t, sp)",
  heartbeat: "heartbeatMotion(t, sp)",
  lightning: "lightningMotion(t, sp)",
  spectral: "spectralMotion(t, sp)",
  electric: "electricMotion(t, sp)"
};

// "pre" deforma a borda (sdf) antes do desfoque; "post" muda o desenho final (edge/core).
const STYLE: Record<StyleName, { pre: string; post: string }> = {
  glow: { pre: "", post: "" },
  torch: {
    pre: "sdf += 0.04 * sin(p.y * 7.0 + t * speed * 3.0) * sin(p.x * 5.0 - t * speed * 2.2);",
    post: ""
  },
  ghost: {
    pre: "sdf += 0.06 * sin(p.x * 6.0 + t * speed * 1.7) * sin(p.y * 5.0 - t * speed * 1.3);",
    post: ""
  },
  flame: {
    pre: `
      float fl = vnoise(vec2(p.x * 3.0, p.y * 3.0 + t * sp * 1.8)) - 0.5;
      sdf += 0.28 * fl + 0.05 * sin(p.x * 9.0 + t * sp * 5.0) + 0.08 * p.y;`,
    post: "coreMix = 0.65;"
  },
  ring: {
    pre: "",
    post: `
      float th = 0.10 + 0.45 * softness;
      float ringIn = smoothstep(-th, -th * 0.25, sdf);
      float ringOut = 1.0 - smoothstep(-th * 0.25, 0.0, sdf);
      float fill = 0.10 * (1.0 - smoothstep(-0.02, 0.0, sdf));
      edge = max(ringIn * ringOut, fill);
      core = 0.0;`
  },
  ripple: {
    pre: "",
    post: `
      float dnorm = clamp(1.0 + sdf, 0.0, 1.0);
      float wave = 0.5 + 0.5 * sin((dnorm * 3.0 - t * sp * 0.8) * 6.2831853);
      wave = wave * wave * wave;
      edge = edge * (0.12 + 0.88 * wave);`
  },
  beams: {
    pre: "",
    post: `
      float ang = t * sp * 1.2;
      vec2 dir = vec2(cos(ang), sin(ang));
      vec2 nrm = normalize(p + vec2(0.0001, 0.0));
      float beam = smoothstep(0.90, 0.995, abs(dot(nrm, dir)));
      edge = edge * (0.10 + 0.90 * beam);
      core = core * 0.6;`
  },
  electric: {
    pre: `
      float tj = mod(floor(t * sp * 12.0), 97.0);
      sdf += 0.22 * (vnoise(p * 5.0 + vec2(tj * 7.31, tj * 3.17)) - 0.5);`,
    post: `
      float arc = 1.0 - smoothstep(0.0, 0.10, abs(sdf + 0.18));
      edge = max(arc, edge * 0.22);
      core = core * 0.5;`
  },
  bubbles: {
    pre: "",
    post: `
      vec2 g = vec2(p.x * 4.5, p.y * 4.5 + t * sp * 0.9);
      vec2 cell = floor(g);
      vec2 f = fract(g) - 0.5;
      float h = hash2(cell);
      vec2 jit = vec2(hash2(cell + vec2(3.1, 0.0)), hash2(cell + vec2(0.0, 7.7))) - 0.5;
      float rr = 0.10 + 0.10 * hash2(cell + vec2(5.0, 5.0));
      float dd = length(f - jit * 0.5);
      float rim = smoothstep(rr - 0.05, rr, dd) * (1.0 - smoothstep(rr, rr + 0.03, dd));
      float body = (1.0 - smoothstep(rr - 0.02, rr, dd)) * 0.35;
      float bub = (rim + body) * step(0.35, h);
      edge = clamp(edge * 0.30 + bub * edge * 1.4, 0.0, 1.0);`
  },
  orbit: {
    pre: "",
    post: `
      float spark = 0.0;
      for (int i = 0; i < 4; i++) {
        float aa = t * sp * 1.6 + float(i) * 1.5707963;
        vec2 pos = vec2(cos(aa), sin(aa)) * 0.62;
        spark += 1.0 - smoothstep(0.0, 0.15, length(p - pos));
      }
      edge = clamp(edge * 0.22 + clamp(spark, 0.0, 1.0) * edge * 1.5, 0.0, 1.0);`
  },
  sparkle: {
    pre: "",
    post: `
      vec2 g = p * 7.0;
      vec2 cell = floor(g);
      vec2 f = fract(g) - 0.5;
      float h = hash2(cell);
      vec2 jit = vec2(hash2(cell + vec2(1.7, 0.0)), hash2(cell + vec2(0.0, 9.1))) - 0.5;
      float dd = length(f - jit * 0.5);
      float tw = 0.5 + 0.5 * sin(t * sp * 2.5 + h * 18.85);
      float spark = (1.0 - smoothstep(0.0, 0.18, dd)) * step(0.45, h) * tw * tw;
      edge = clamp(edge * 0.30 + spark * edge * 1.3, 0.0, 1.0);`
  }
};

// Estilos com ruído/laços por pixel são os mais caros. Qualidade média e baixa trocam por brilho simples.
const HEAVY_STYLES: StyleName[] = ["flame", "electric", "sparkle", "bubbles", "orbit"];
const LIGHT_STYLES: StyleName[] = ["glow", "ring"];

export function styleFor(presetKey: Preset, quality: Quality): StyleName {
  const name = (PRESETS[presetKey] ?? PRESETS.torch).style;
  if (quality === "high") return name;
  if (quality === "medium") return HEAVY_STYLES.includes(name) ? "glow" : name;
  return LIGHT_STYLES.includes(name) ? name : "glow";
}

function buildShader(presetKey: Preset, extraUniforms: string, helpers: string, geometry: string, quality: Quality = "high") {
  const def = PRESETS[presetKey] ?? PRESETS.torch;
  const style = STYLE[styleFor(presetKey, quality)];
  // "size" e "time" são fornecidos pelo renderizador de efeitos do Owlbear.
  return `
    uniform vec2 size;
    uniform float time;
    uniform float intensity;
    uniform float speed;
    uniform float softness;
    uniform vec3 auraColor;
    uniform vec3 gradientColor;
    uniform float gradientEnabled;
    uniform float gradientAngle;
    ${extraUniforms}
    ${MOTION_FUNCTIONS}
    ${helpers}

    half4 main(float2 coord) {
      float sp = max(speed, 0.05);
      float t = time;

      // A geometria define "p" (coordenada normalizada) e "sdf" (distância assinada até a borda:
      // negativa dentro, 0 na borda, positiva fora).
      ${geometry}
      ${style.pre}

      float s = max(softness, 0.03);
      float edge = 1.0 - smoothstep(-s, 0.0, sdf);
      float core = 1.0 - smoothstep(-1.0, -0.3, sdf);
      float coreMix = 0.30;
      ${style.post}

      float motion = ${MOTION_EXPR[def.motion]};
      float a = clamp(edge * intensity * motion, 0.0, 1.0);
      vec2 gradientDir = vec2(cos(gradientAngle), sin(gradientAngle));
      float gradientT = clamp(0.5 + 0.5 * dot(p, gradientDir), 0.0, 1.0);
      vec3 baseColor = mix(auraColor, gradientColor, gradientEnabled * gradientT);
      vec3 color = mix(baseColor, vec3(1.0), core * coreMix);

      // Cor pré-multiplicada pelo alfa: necessário para os modos de mistura funcionarem direito.
      return half4(color * a, a);
    }
  `;
}

// Token: círculo, quadrado, cone ou linha, saindo do centro da imagem.
// Para cone/linha, "dirRad" é a direção (0 = para cima, sentido horário) e o efeito gira junto com o token.
export function shaderFor(presetKey: Preset, quality: Quality = "high") {
  return buildShader(presetKey,
    "uniform float shape; uniform float coneHalf; uniform float coneIn; uniform float beamHalf; uniform float dirRad;", "", `
      vec2 p = coord / size * 2.0 - 1.0;
      float cr = clamp(softness * 0.5, 0.0, 0.5);
      vec2 q = abs(p) - (1.0 - cr);
      float boxSdf = length(max(q, vec2(0.0))) + min(max(q.x, q.y), 0.0) - cr;
      float circleSdf = length(p) - 1.0;
      float sdf = mix(circleSdf, boxSdf, clamp(shape, 0.0, 1.0));
      if (shape > 1.5) {
        // Eixo do cone/linha: gx = lado, gy = distância ao longo da direção.
        vec2 gd = vec2(sin(dirRad), -cos(dirRad));
        vec2 gp = vec2(p.x * gd.y - p.y * gd.x, p.x * gd.x + p.y * gd.y);
        if (shape < 2.5) {
          // Setor circular (cone) com o vértice no centro do token.
          vec2 gc = vec2(sin(coneHalf), cos(coneHalf));
          vec2 gq = vec2(abs(gp.x), gp.y);
          float gl = length(gq) - 1.0;
          float gm = length(gq - gc * clamp(dot(gq, gc), 0.0, 1.0));
          float gs = sign(gc.y * gq.x - gc.x * gq.y);
          sdf = max(gl, gm * gs) / max(coneIn, 0.05);
        } else {
          // Faixa de largura fixa, do centro até a borda do raio.
          vec2 gb = abs(vec2(gp.x, gp.y - 0.5)) - vec2(beamHalf, 0.5);
          sdf = (length(max(gb, vec2(0.0))) + min(max(gb.x, gb.y), 0.0)) / max(beamHalf, 0.02);
        }
      }`, quality);
}

const AREA_HELPERS = `
    // Um lado do contorno: atualiza a menor distância (dist) e o sinal dentro/fora (sgn).
    void edgeStep(vec2 c, vec2 a, vec2 b, inout float dist, inout float sgn) {
      vec2 pa = c - a;
      vec2 ba = b - a;
      float h = clamp(dot(pa, ba) / max(dot(ba, ba), 0.0001), 0.0, 1.0);
      dist = min(dist, length(pa - ba * h));
      bool above1 = a.y > c.y;
      bool above2 = b.y > c.y;
      if (above1 != above2) {
        if (c.x < (b.x - a.x) * (c.y - a.y) / (b.y - a.y) + a.x) sgn = -sgn;
      }
    }`;

// Desenho: a luz segue o contorno real do desenho (pontos embutidos no shader, em pixels locais).
export function shaderForArea(presetKey: Preset, pts: Vec2[], width: number, height: number, spread: number, unit: number, quality: Quality = "high") {
  const f = (n: number) => n.toFixed(1);
  const edges = pts
    .map((a, i) => {
      const b = pts[(i + 1) % pts.length];
      return `edgeStep(c, vec2(${f(a.x)}, ${f(a.y)}), vec2(${f(b.x)}, ${f(b.y)}), dist, sgn);`;
    })
    .join("\n      ");
  return buildShader(presetKey, "", AREA_HELPERS, `
      // "c" fica nas mesmas unidades dos pontos embutidos, qualquer que seja a escala do "coord".
      vec2 c = coord / size * vec2(${f(width)}, ${f(height)});
      float dist = 100000.0;
      float sgn = 1.0;
      ${edges}
      float unit = ${f(unit)};
      vec2 p = (c - vec2(${f(width)}, ${f(height)}) * 0.5) / unit;
      float sdf = (sgn * dist - ${f(spread)}) / unit;`, quality);
}

// Uniforms extras do token (cone/linha). Valores já na escala do shader (1 = raio da aura).
export function tokenShapeUniforms(cfg: AuraConfig) {
  const half = (Math.min(170, Math.max(10, cfg.angle)) * Math.PI) / 360;
  const sinH = Math.sin(half);
  return {
    shapeId: cfg.shape === "square" ? 1 : cfg.shape === "cone" ? 2 : cfg.shape === "line" ? 3 : 0,
    coneHalf: half,
    coneIn: sinH / (1 + sinH), // raio do maior círculo que cabe no cone (normaliza a borda)
    beamHalf: Math.min(1, cfg.width / (2 * Math.max(0.5, cfg.radius))),
    dirRad: (cfg.direction * Math.PI) / 180
  };
}

// ---- Luz do Dynamic Fog (item LIGHT do SDK) ----
// Suposição, não confirmada na documentação: ângulos em graus e rotação 0 = mesmo "zero" do item.
// "fogOffset" (Configurações) corrige a direção se o cone do fog sair torto em relação ao visual.
export function fogParams(token: Image, cfg: AuraConfig, dpi: number, quality: Quality, fogOffset: number) {
  const radius = Math.max(0.5, cfg.radius) * dpi;
  const directional = isDirectional(cfg);
  let outer = 0;
  if (cfg.shape === "cone") outer = cfg.angle;
  else if (cfg.shape === "line") {
    // O fog não tem "faixa": aproxima por um cone bem fino que cobre a largura no meio do alcance.
    const widthPx = cfg.width * dpi;
    outer = Math.min(40, Math.max(4, (2 * Math.atan2(widthPx / 2, radius * 0.5) * 180) / Math.PI));
  }
  const soft = quality === "high" ? cfg.softness : 0;
  return {
    position: tokenCenter(token, dpi),
    rotation: token.rotation + (directional ? cfg.direction + fogOffset : 0),
    attenuationRadius: radius,
    // sourceRadius 0 usa o caminho mais rápido do fog (sombras duras): só em qualidade alta há sombras suaves.
    sourceRadius: quality === "high" ? 0.15 * dpi : 0,
    falloff: cfg.softness,
    directional,
    outerAngle: outer,
    innerAngle: outer * (1 - 0.35 * soft),
    lightType: cfg.fog === "secondary" ? "SECONDARY" : cfg.fog === "auxiliary" ? "AUXILIARY" : "PRIMARY"
  };
}
