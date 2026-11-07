import { isCurve, isImage, isShape } from "@owlbear-rodeo/sdk";
import type { Curve, Image, Item, Shape as ObrShape } from "@owlbear-rodeo/sdk";

export const EXTENSION_ID = "com.example.dynamic-auras-lights";
// A aura de cada token fica guardada nos metadados dele (sincroniza com a sala e com a cena salva).
export const AURA_KEY = `${EXTENSION_ID}/aura`;
export const DRAFT_KEY = `${EXTENSION_ID}/draft`;
export const EDITOR_ID = `${EXTENSION_ID}/editor`;
export const VERSION = "1.3.0";
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

export type StyleName = "glow" | "torch" | "ghost" | "flame" | "ring" | "ripple" | "beams" | "electric" | "sparkle";
export type MotionName =
  | "static" | "torch" | "candle" | "faulty" | "powercut" | "neon" | "strobe"
  | "pulse" | "heartbeat" | "lightning" | "spectral" | "electric";
export type Group = "light" | "aura";
export type Shape = "circle" | "square";
export type Placement = "below" | "above";
export type BlendModeName =
  | "SRC_OVER" | "SOFT_LIGHT" | "HARD_LIGHT" | "OVERLAY" | "SCREEN" | "COLOR_DODGE"
  | "PLUS" | "MULTIPLY" | "COLOR_BURN" | "DARKEN" | "LIGHTEN" | "DIFFERENCE";

type PresetDef = {
  label: string; group: Group; color: string; intensity: number; speed: number;
  softness: number; style: StyleName; motion: MotionName;
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
  sparkle:   { label: "Cintilante",         group: "aura",  color: "#ffe9a8", intensity: 1.00, speed: 1.0, softness: 0.70, style: "sparkle",  motion: "static" }
} satisfies Record<string, PresetDef>;

export type Preset = keyof typeof PRESETS;

export const GROUP_LABELS: Record<Group, string> = { light: "Iluminação", aura: "Auras" };

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
  radius: number;
  intensity: number;
  speed: number;
  softness: number;
  shape: Shape;
  placement: Placement;
  blendMode: BlendModeName;
};

export const DEFAULT_CONFIG: AuraConfig = {
  preset: "torch",
  color: PRESETS.torch.color,
  radius: 3,
  intensity: PRESETS.torch.intensity,
  speed: PRESETS.torch.speed,
  softness: PRESETS.torch.softness,
  shape: "circle",
  placement: "below",
  blendMode: "SRC_OVER"
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
  const shape: Shape = r.shape === "square" ? "square" : "circle";
  const placement: Placement = r.placement === "above" ? "above" : "below";
  const blendMode = BLEND_MODES.some((m) => m.value === r.blendMode) ? (r.blendMode as BlendModeName) : "SRC_OVER";
  return {
    preset,
    color,
    radius: num(r.radius, DEFAULT_CONFIG.radius, 0, 20),
    intensity: num(r.intensity, PRESETS[preset].intensity, 0.1, 1.5),
    speed: num(r.speed, PRESETS[preset].speed, 0, 8),
    softness: num(r.softness, PRESETS[preset].softness, 0, 1),
    shape,
    placement,
    blendMode
  };
}

export function loadDraft(): AuraConfig {
  try { return normalizeConfig(JSON.parse(localStorage.getItem(DRAFT_KEY) ?? "null")); }
  catch { return { ...DEFAULT_CONFIG }; }
}
export function saveDraft(config: AuraConfig) {
  try { localStorage.setItem(DRAFT_KEY, JSON.stringify(config)); } catch { /* ignora */ }
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
export function areaGeometry(polygon: Vec2[], cfg: AuraConfig, dpi: number): AreaGeometry {
  let pts = simplifyPolygon(polygon, Math.max(1, dpi * 0.04));
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
  return { x, y, width, height, sksl: shaderForArea(cfg.preset, local, width, height, spread, unit) };
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

function buildShader(presetKey: Preset, extraUniforms: string, helpers: string, geometry: string) {
  const def = PRESETS[presetKey] ?? PRESETS.torch;
  const style = STYLE[def.style];
  // "size" e "time" são fornecidos pelo renderizador de efeitos do Owlbear.
  return `
    uniform vec2 size;
    uniform float time;
    uniform float intensity;
    uniform float speed;
    uniform float softness;
    uniform vec3 auraColor;
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
      vec3 color = mix(auraColor, vec3(1.0), core * coreMix);

      // Cor pré-multiplicada pelo alfa: necessário para os modos de mistura funcionarem direito.
      return half4(color * a, a);
    }
  `;
}

// Token: círculo ou quadrado centrado na imagem.
export function shaderFor(presetKey: Preset) {
  return buildShader(presetKey, "uniform float shape;", "", `
      vec2 p = coord / size * 2.0 - 1.0;
      float cr = clamp(softness * 0.5, 0.0, 0.5);
      vec2 q = abs(p) - (1.0 - cr);
      float boxSdf = length(max(q, vec2(0.0))) + min(max(q.x, q.y), 0.0) - cr;
      float circleSdf = length(p) - 1.0;
      float sdf = mix(circleSdf, boxSdf, shape);`);
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
export function shaderForArea(presetKey: Preset, pts: Vec2[], width: number, height: number, spread: number, unit: number) {
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
      float sdf = (sgn * dist - ${f(spread)}) / unit;`);
}
