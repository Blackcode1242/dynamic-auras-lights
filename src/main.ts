import OBR, { buildEffect } from "@owlbear-rodeo/sdk";
import "./style.css";

const EXTENSION_ID = "com.example.dynamic-auras-lights";
const STORAGE_KEY = `${EXTENSION_ID}/local-effects`;

type Preset = "torch" | "faulty" | "arcane" | "emergency" | "divine" | "spectral" | "pulse" | "static";
type Config = { preset: Preset; color: string; radius: number; intensity: number; speed: number };

const presets: Record<Preset, { label: string; color: string; intensity: number; speed: number; mode: string }> = {
  torch:     { label: "Tocha",             color: "#ff9b42", intensity: 0.82, speed: 1.8, mode: "torch" },
  faulty:    { label: "Lâmpada defeituosa",color: "#fff2c4", intensity: 0.95, speed: 5.0, mode: "faulty" },
  arcane:    { label: "Arcana",            color: "#55aaff", intensity: 0.78, speed: 1.3, mode: "pulse" },
  emergency:{ label: "Emergência",         color: "#ff3030", intensity: 0.9,  speed: 2.8, mode: "strobe" },
  divine:    { label: "Divina",            color: "#ffe8a3", intensity: 0.9,  speed: 0.7, mode: "pulse" },
  spectral:  { label: "Espectral",         color: "#71e5b4", intensity: 0.72, speed: 1.1, mode: "spectral" },
  pulse:     { label: "Pulsante",          color: "#8c7bff", intensity: 0.8,  speed: 1.5, mode: "pulse" },
  static:    { label: "Estática",          color: "#ffe2a1", intensity: 0.8,  speed: 0,   mode: "static" }
};

function hexToRgb(hex: string) {
  const value = hex.replace("#", "");
  return {
    x: parseInt(value.slice(0, 2), 16) / 255,
    y: parseInt(value.slice(2, 4), 16) / 255,
    z: parseInt(value.slice(4, 6), 16) / 255
  };
}

function shaderFor(mode: string) {
  // O uniform "time" é fornecido pelo renderizador de efeitos do Owlbear.
  const motion = {
    torch: "0.78 + 0.12*sin(time*8.1) + 0.07*sin(time*17.3) + 0.03*sin(time*31.7)",
    faulty: "step(0.28, fract(sin(floor(time*speed)*91.7)*43758.5)) * (0.35 + 0.65*abs(sin(time*19.0)))",
    strobe: "step(0.48, fract(time*speed*2.0))",
    pulse: "0.55 + 0.45*(0.5 + 0.5*sin(time*speed*6.283))",
    spectral: "0.65 + 0.18*sin(time*speed*2.1) + 0.12*sin(time*speed*4.7)",
    static: "1.0"
  }[mode] ?? "1.0";

  return `
    uniform vec2 size;
    uniform float time;
    uniform float intensity;
    uniform float speed;
    uniform vec3 auraColor;
    half4 main(float2 coord) {
      vec2 p = coord / size * 2.0 - 1.0;
      float d = length(p);
      float edge = 1.0 - smoothstep(0.12, 1.0, d);
      float core = 1.0 - smoothstep(0.0, 0.48, d);
      float motion = ${motion};
      float alpha = edge * intensity * motion * 0.42;
      vec3 color = mix(auraColor, vec3(1.0), core * 0.28);
      return half4(color, alpha);
    }
  `;
}

async function selectedTokens() {
  const ids = await OBR.player.getSelection();
  if (!ids?.length) return [];
  const items = await OBR.scene.items.getItems(ids);
  return items.filter((item) => item.type === "IMAGE" && item.layer === "CHARACTER");
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
  const effects = tokens.map((token) => {
    const effect = buildEffect()
      .effectType("STANDALONE")
      .width(radius * 2)
      .height(radius * 2)
      .position(token.position)
      .attachedTo(token.id)
      .layer("DRAWING")
      .locked(true)
      .disableHit(true)
      .uniforms([
        { name: "auraColor", value: hexToRgb(config.color) },
        { name: "intensity", value: config.intensity },
        { name: "speed", value: config.speed }
      ])
      .sksl(shaderFor(preset.mode))
      .build();
    return effect;
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
            <input id="color" type="color" value="${presets.torch.color}" />
          </div>
          <div class="field grow">
            <label for="radius">Raio (quadrados)</label>
            <input id="radius" type="number" min="0.5" max="20" step="0.5" value="3" />
          </div>
        </div>
        <label for="intensity">Intensidade <output id="intensityValue">82%</output></label>
        <input id="intensity" type="range" min="0.1" max="1" step="0.01" value="0.82" />
        <label for="speed">Velocidade <output id="speedValue">1.8</output></label>
        <input id="speed" type="range" min="0" max="8" step="0.1" value="1.8" />
        <button id="apply" class="primary">Aplicar ao(s) token(s) selecionado(s)</button>
        <button id="remove" class="secondary">Remover efeitos criados por mim</button>
      </section>
      <p class="hint">Selecione o token no mapa antes de aplicar. Os efeitos desta versão são locais ao seu navegador/instância.</p>
      <footer>Versão inicial · efeitos shader em tempo real</footer>
    </main>
  `;

  const presetEl = app.querySelector<HTMLSelectElement>("#preset")!;
  const colorEl = app.querySelector<HTMLInputElement>("#color")!;
  const intensityEl = app.querySelector<HTMLInputElement>("#intensity")!;
  const speedEl = app.querySelector<HTMLInputElement>("#speed")!;
  const intensityValue = app.querySelector<HTMLOutputElement>("#intensityValue")!;
  const speedValue = app.querySelector<HTMLOutputElement>("#speedValue")!;

  const updateFromPreset = () => {
    const p = presets[presetEl.value as Preset];
    colorEl.value = p.color;
    intensityEl.value = String(p.intensity);
    speedEl.value = String(p.speed);
    intensityValue.value = `${Math.round(p.intensity * 100)}%`;
    speedValue.value = String(p.speed);
  };
  presetEl.addEventListener("change", updateFromPreset);
  intensityEl.addEventListener("input", () => intensityValue.value = `${Math.round(Number(intensityEl.value) * 100)}%`);
  speedEl.addEventListener("input", () => speedValue.value = speedEl.value);

  app.querySelector<HTMLButtonElement>("#apply")!.addEventListener("click", async () => {
    const config: Config = {
      preset: presetEl.value as Preset,
      color: colorEl.value,
      radius: Number(app.querySelector<HTMLInputElement>("#radius")!.value),
      intensity: Number(intensityEl.value),
      speed: Number(speedEl.value)
    };
    try { await applyAura(config); }
    catch (error) {
      console.error(error);
      OBR.notification.show("Não foi possível aplicar o efeito. Confira a seleção e as permissões.");
    }
  });
  app.querySelector<HTMLButtonElement>("#remove")!.addEventListener("click", () => {
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
