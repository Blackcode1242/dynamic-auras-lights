import OBR, { buildEffect, isImage } from "@owlbear-rodeo/sdk";
import type { Image } from "@owlbear-rodeo/sdk";
import "./style.css";

const EXTENSION_ID = "com.example.dynamic-auras-lights";
const STORAGE_KEY = `${EXTENSION_ID}/local-effects`;

type MotionMode = "torch" | "faulty" | "powercut" | "strobe" | "pulse" | "spectral" | "static";
type Preset =
  | "torch" | "faulty" | "powercut" | "arcane" | "emergency"
  | "divine" | "spectral" | "pulse" | "static";
type Shape = "circle" | "square";
type Placement = "below" | "above";
type BlendModeName =
  | "SRC_OVER" | "SOFT_LIGHT" | "HARD_LIGHT" | "OVERLAY" | "SCREEN" | "COLOR_DODGE"
  | "PLUS" | "MULTIPLY" | "COLOR_BURN" | "DARKEN" | "LIGHTEN" | "DIFFERENCE";

type Config = {
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

const presets: Record<Preset, {
  label: string; color: string; intensity: number; speed: number; softness: number; mode: MotionMode;
}> = {
  torch:     { label: "Tocha",               color: "#ff9b42", intensity: 0.95, speed: 1.8, softness: 0.70, mode: "torch" },
  faulty:    { label: "Lâmpada defeituosa",  color: "#fff2c4", intensity: 1.00, speed: 5.0, softness: 0.55, mode: "faulty" },
  powercut:  { label: "Queda de energia",    color: "#fff2c4", intensity: 1.00, speed: 1.0, softness: 0.55, mode: "powercut" },
  arcane:    { label: "Arcana",              color: "#55aaff", intensity: 0.90, speed: 1.3, softness: 0.65, mode: "pulse" },
  emergency: { label: "Emergência",          color: "#ff3030", intensity: 1.00, speed: 2.8, softness: 0.40, mode: "strobe" },
  divine:    { label: "Divina",              color: "#ffe8a3", intensity: 0.95, speed: 0.7, softness: 0.80, mode: "pulse" },
  spectral:  { label: "Espectral",           color: "#71e5b4", intensity: 0.85, speed: 1.1, softness: 0.75, mode: "spectral" },
  pulse:     { label: "Pulsante",            color: "#8c7bff", intensity: 0.95, speed: 1.5, softness: 0.65, mode: "pulse" },
  static:    { label: "Estática",            color: "#ffe2a1", intensity: 0.85, speed: 0,   softness: 0.60, mode: "static" }
};

const blendModes: { value: BlendModeName; label: string }[] = [
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

function hexToRgb(hex: string) {
  const value = hex.replace("#", "");
  return {
    x: parseInt(value.slice(0, 2), 16) / 255,
    y: parseInt(value.slice(2, 4), 16) / 255,
    z: parseInt(value.slice(4, 6), 16) / 255
  };
}

// Funções de animação (0 = apagado, 1 = aceso). Ficam no início de todo shader.
const MOTION_FUNCTIONS = `
  float hash(float n) {
    float x = fract(n * 0.1031);
    x *= x + 33.33;
    x *= x + x;
    return fract(x);
  }

  // Tocha: respiração lenta + ruído rápido suavizado. Varia de ~0.35 a ~1.1.
  float torchMotion(float t, float sp) {
    float k = t * sp;
    float slow = 0.5 + 0.5 * sin(k * 3.1 + sin(k * 1.7) * 2.0);
    float n = k * 6.0;
    float noise = mix(hash(floor(n)), hash(floor(n) + 1.0), smoothstep(0.0, 1.0, fract(n)));
    return 0.35 + 0.30 * slow + 0.45 * noise;
  }

  // Lâmpada defeituosa: janelas aleatórias. Algumas ficam estáveis, outras piscam
  // (liga/desliga seco) e algumas apagam por completo. Ao religar há um clarão.
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

  // Espectral: oscilação irregular e bem visível.
  float spectralMotion(float t, float sp) {
    float k = t * sp;
    return 0.55 + 0.25 * sin(k * 2.1) + 0.20 * sin(k * 4.7 + 1.3);
  }
`;

const MOTION_EXPR: Record<MotionMode, string> = {
  torch: "torchMotion(time, sp)",
  faulty: "faultyMotion(time, sp)",
  powercut: "powercutMotion(time, sp)",
  strobe: "strobeMotion(time, sp)",
  pulse: "pulseMotion(time, sp)",
  spectral: "spectralMotion(time, sp)",
  static: "1.0"
};

// Deformação orgânica da borda (só tocha e espectral).
const WOBBLE_EXPR: Record<MotionMode, string> = {
  torch: "0.04 * sin(p.y * 7.0 + time * speed * 3.0) * sin(p.x * 5.0 - time * speed * 2.2)",
  spectral: "0.06 * sin(p.x * 6.0 + time * speed * 1.7) * sin(p.y * 5.0 - time * speed * 1.3)",
  faulty: "0.0", powercut: "0.0", strobe: "0.0", pulse: "0.0", static: "0.0"
};

function shaderFor(mode: MotionMode) {
  // "size" e "time" são fornecidos pelo renderizador de efeitos do Owlbear.
  return `
    uniform vec2 size;
    uniform float time;
    uniform float intensity;
    uniform float speed;
    uniform float softness;
    uniform float shape;
    uniform vec3 auraColor;
    ${MOTION_FUNCTIONS}

    half4 main(float2 coord) {
      vec2 p = coord / size * 2.0 - 1.0;
      float sp = max(speed, 0.05);

      // Distância assinada até a borda: negativa dentro, 0 na borda, positiva fora.
      // Círculo: length(p) - 1. Quadrado: caixa com cantos que arredondam conforme a suavidade.
      float cr = clamp(softness * 0.5, 0.0, 0.5);
      vec2 q = abs(p) - (1.0 - cr);
      float boxSdf = length(max(q, vec2(0.0))) + min(max(q.x, q.y), 0.0) - cr;
      float circleSdf = length(p) - 1.0;
      float sdf = mix(circleSdf, boxSdf, shape) + (${WOBBLE_EXPR[mode]});

      // Borda difusa: o desfoque ocupa a faixa "softness" mais externa do raio.
      float s = max(softness, 0.03);
      float edge = 1.0 - smoothstep(-s, 0.0, sdf);
      float core = 1.0 - smoothstep(-1.0, -0.3, sdf);

      float motion = ${MOTION_EXPR[mode]};
      float a = clamp(edge * intensity * motion, 0.0, 1.0);
      vec3 color = mix(auraColor, vec3(1.0), core * 0.30);

      // Cor pré-multiplicada pelo alfa: necessário para os modos de mistura funcionarem direito.
      return half4(color * a, a);
    }
  `;
}

async function selectedTokens(): Promise<Image[]> {
  const ids = await OBR.player.getSelection();
  if (!ids?.length) return [];
  const items = await OBR.scene.items.getItems(ids);
  return items.filter((item): item is Image => isImage(item) && item.layer === "CHARACTER");
}

// Centro visual da imagem do token em coordenadas do mapa.
// A "position" de uma imagem é o ponto de ancoragem (grid.offset), não o centro nem o canto.
function tokenCenter(token: Image, dpi: number) {
  const dpiScale = dpi / token.grid.dpi;
  const width = token.image.width * dpiScale * token.scale.x;
  const height = token.image.height * dpiScale * token.scale.y;
  const offsetX = (token.grid.offset.x / token.image.width) * width;
  const offsetY = (token.grid.offset.y / token.image.height) * height;

  // Vetor do ponto de ancoragem até o centro da imagem, girado junto com o token.
  const vx = width / 2 - offsetX;
  const vy = height / 2 - offsetY;
  const rad = (token.rotation * Math.PI) / 180;
  return {
    x: token.position.x + vx * Math.cos(rad) - vy * Math.sin(rad),
    y: token.position.y + vx * Math.sin(rad) + vy * Math.cos(rad)
  };
}

function getSavedIds(): string[] {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]"); }
  catch { return []; }
}
function saveIds(ids: string[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
}

async function applyAura(config: Config) {
  const tokens = await selectedTokens();
  if (!tokens.length) {
    OBR.notification.show("Selecione um ou mais tokens na camada de personagens.");
    return;
  }

  const dpi = await OBR.scene.grid.getDpi();
  const radius = Math.max(0.5, config.radius) * dpi;
  const preset = presets[config.preset];
  const sksl = shaderFor(preset.mode);

  const effects = tokens.map((token) => {
    const center = tokenCenter(token, dpi);
    return buildEffect()
      .effectType("STANDALONE")
      .width(radius * 2)
      .height(radius * 2)
      // A posição de um efeito é o canto superior esquerdo, então recuamos um raio.
      .position({ x: center.x - radius, y: center.y - radius })
      .attachedTo(token.id)
      .layer(config.placement === "above" ? "ATTACHMENT" : "DRAWING")
      .blendMode(config.blendMode)
      .locked(true)
      .disableHit(true)
      .uniforms([
        { name: "auraColor", value: hexToRgb(config.color) },
        { name: "intensity", value: config.intensity },
        { name: "speed", value: config.speed },
        { name: "softness", value: config.softness },
        { name: "shape", value: config.shape === "square" ? 1 : 0 }
      ])
      .sksl(sksl)
      .build();
  });

  await OBR.scene.local.addItems(effects);
  saveIds([...getSavedIds(), ...effects.map((effect) => effect.id)]);
  OBR.notification.show(`Aura aplicada em ${tokens.length} token(s).`);
}

async function removeAuras() {
  const ids = getSavedIds();
  if (!ids.length) {
    OBR.notification.show("Não há efeitos locais registrados para remover.");
    return;
  }
  await OBR.scene.local.deleteItems(ids);
  saveIds([]);
  OBR.notification.show("Efeitos removidos deste navegador.");
}

function render() {
  const app = document.querySelector<HTMLDivElement>("#app")!;
  const first = presets.torch;
  app.innerHTML = `
    <main>
      <header>
        <div class="eyebrow">OWLBEAR RODEO · EXTENSION</div>
        <h1>Dynamic Auras <span>& Lights</span></h1>
        <p class="sub">Iluminação animada para seus tokens.</p>
      </header>
      <section class="panel">
        <label for="preset">Efeito</label>
        <select id="preset">
          ${Object.entries(presets).map(([key, value]) => `<option value="${key}">${value.label}</option>`).join("")}
        </select>
        <div class="row">
          <div class="field grow">
            <label for="color">Cor</label>
            <input id="color" type="color" value="${first.color}" />
          </div>
          <div class="field grow">
            <label for="radius">Raio (quadrados)</label>
            <input id="radius" type="number" min="0.5" max="20" step="0.5" value="3" />
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
          ${blendModes.map((m) => `<option value="${m.value}">${m.label}</option>`).join("")}
        </select>
        <label for="softness">Suavidade da borda <output id="softnessValue">${Math.round(first.softness * 100)}%</output></label>
        <input id="softness" type="range" min="0" max="1" step="0.01" value="${first.softness}" />
        <label for="intensity">Intensidade <output id="intensityValue">${Math.round(first.intensity * 100)}%</output></label>
        <input id="intensity" type="range" min="0.1" max="1.5" step="0.01" value="${first.intensity}" />
        <label for="speed">Velocidade <output id="speedValue">${first.speed}</output></label>
        <input id="speed" type="range" min="0" max="8" step="0.1" value="${first.speed}" />
        <button id="apply" class="primary">Aplicar ao(s) token(s) selecionado(s)</button>
        <button id="remove" class="secondary">Remover efeitos criados por mim</button>
      </section>
      <p class="hint">Selecione o token no mapa antes de aplicar. Os efeitos desta versão são locais ao seu navegador/instância.</p>
      <footer>Versão 1.1 · efeitos shader em tempo real</footer>
    </main>
  `;

  const $ = <T extends HTMLElement>(sel: string) => app.querySelector<T>(sel)!;
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

  const updateFromPreset = () => {
    const p = presets[presetEl.value as Preset];
    colorEl.value = p.color;
    intensityEl.value = String(p.intensity);
    speedEl.value = String(p.speed);
    softnessEl.value = String(p.softness);
    intensityValue.value = `${Math.round(p.intensity * 100)}%`;
    speedValue.value = String(p.speed);
    softnessValue.value = `${Math.round(p.softness * 100)}%`;
  };
  presetEl.addEventListener("change", updateFromPreset);
  intensityEl.addEventListener("input", () => intensityValue.value = `${Math.round(Number(intensityEl.value) * 100)}%`);
  softnessEl.addEventListener("input", () => softnessValue.value = `${Math.round(Number(softnessEl.value) * 100)}%`);
  speedEl.addEventListener("input", () => speedValue.value = speedEl.value);

  $<HTMLButtonElement>("#apply").addEventListener("click", async () => {
    const config: Config = {
      preset: presetEl.value as Preset,
      color: colorEl.value,
      radius: Number(radiusEl.value),
      intensity: Number(intensityEl.value),
      speed: Number(speedEl.value),
      softness: Number(softnessEl.value),
      shape: shapeEl.value as Shape,
      placement: placementEl.value as Placement,
      blendMode: blendEl.value as BlendModeName
    };
    try { await applyAura(config); }
    catch (error) {
      console.error(error);
      OBR.notification.show("Não foi possível aplicar o efeito. Confira a seleção e as permissões.");
    }
  });
  $<HTMLButtonElement>("#remove").addEventListener("click", () => {
    removeAuras().catch((error) => {
      console.error(error);
      OBR.notification.show("Falha ao remover os efeitos.");
    });
  });
}

render();
OBR.onReady(() => {
  document.body.classList.add("obr-ready");
});
