// Shaders (SkSL) dos efeitos especiais. Cada efeito tem a sua própria lógica de tempo e de forma:
// não são variações de cor de uma mesma animação.
//
// Entradas comuns:
//   progress  0 -> 1  fase de entrada (o efeito se forma)
//   fade      1 -> 0  fase de saída
//   time      relógio do Owlbear, usado só para movimentos em repetição
// O código da região (special.ts / runFrame) define p, sdf, pdist, extent e gw.
import { REGION_HELPERS } from "./special";
import type { SpecialId } from "./special";

const COMMON = `
  uniform vec2 size;
  uniform float time;
  uniform float intensity;
  uniform float speed;
  uniform vec3 fxColor;
  uniform float progress;
  uniform float fade;
  uniform float seed;

  float hash(float n) {
    n = mod(n, 4096.0);
    float x = fract(n * 0.1031);
    x *= x + 33.33;
    x *= x + x;
    return fract(x);
  }
  float hash2(vec2 q) { return hash(q.x + q.y * 57.0); }
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
  float fbm(vec2 q) {
    float v = 0.0;
    float a = 0.5;
    for (int i = 0; i < 4; i++) {
      v += a * vnoise(q);
      q = q * 2.03 + vec2(17.1, 9.7);
      a *= 0.5;
    }
    return v;
  }
  // Células de Voronoi: x = distância à semente mais próxima, y = à segunda, z = identificador da célula.
  vec3 voro(vec2 q) {
    vec2 i = floor(q);
    vec2 f = fract(q);
    float f1 = 8.0;
    float f2 = 8.0;
    float id = 0.0;
    for (int yy = -1; yy <= 1; yy++) {
      for (int xx = -1; xx <= 1; xx++) {
        vec2 g = vec2(float(xx), float(yy));
        vec2 o = vec2(hash2(i + g + vec2(3.1, 7.7)), hash2(i + g + vec2(11.3, 2.9)));
        vec2 r = g + o - f;
        float d = dot(r, r);
        if (d < f1) { f2 = f1; f1 = d; id = hash2(i + g); }
        else if (d < f2) { f2 = d; }
      }
    }
    return vec3(sqrt(f1), sqrt(f2), id);
  }
`;

// Cada função devolve vec4(cor, alfa). "m" é a máscara da região (1 dentro, 0 fora).
const EFFECTS: Record<SpecialId, string> = {
  // Revelação: a energia se condensa por regiões (ruído) e a frente de formação brilha. Ao final, brilho estável.
  reveal: `
  vec4 fx(vec2 p, float rn, float m, float sdf, float pdist, float gw, float extent, float t, float sp, float prog) {
    float n = fbm(p * 2.2 + seed);
    float front = mix(0.10, 0.98, prog);
    float revealed = 1.0 - smoothstep(front - 0.03, front + 0.03, n);
    float x = (n - front) / 0.05;
    float edge = exp(-x * x);
    float calm = 0.75 + 0.25 * sin(t * sp * 3.0 + n * 12.0);
    float a = m * (revealed * (0.08 + 0.26 * n) * calm + 0.95 * edge * (1.0 - 0.3 * prog));
    float w = edge * 0.7 + 0.15 * revealed;
    return vec4(mix(fxColor, vec3(1.0), clamp(w, 0.0, 1.0)), a);
  }`,

  // Impacto: clarão no centro, anel de choque que se expande e raios radiais. Termina rápido.
  impact: `
  vec4 fx(vec2 p, float rn, float m, float sdf, float pdist, float gw, float extent, float t, float sp, float prog) {
    float flash = exp(-prog * 9.0) * (1.0 - smoothstep(0.0, 1.25, rn));
    float R = prog * 1.25;
    float x = (rn - R) / 0.09;
    float ring = exp(-x * x) * (1.0 - prog);
    float ang = atan(p.y, p.x);
    float x2 = (rn - R * 0.75) / 0.25;
    float streak = pow(abs(sin(ang * 8.0 + seed * 3.0)), 24.0) * exp(-x2 * x2) * (1.0 - prog);
    float a = m * (flash * 1.1 + ring + streak * 0.8);
    float w = flash * 0.9 + ring * 0.5 + streak * 0.3;
    return vec4(mix(fxColor, vec3(1.0), clamp(w, 0.0, 1.0)), a);
  }`,

  // Manifestação: um portal que cresce do centro, com redemoinho em repetição que permanece.
  manifest: `
  vec4 fx(vec2 p, float rn, float m, float sdf, float pdist, float gw, float extent, float t, float sp, float prog) {
    float grow = smoothstep(0.0, 1.0, prog);
    float R = grow * 1.05;
    float xe = (rn - R) / 0.06;
    float edgeBand = exp(-xe * xe) * step(0.001, grow);
    float ang = atan(p.y, p.x);
    float swirl = 0.5 + 0.5 * sin(ang * 3.0 + rn * 9.0 - t * sp * 2.2 + seed);
    float swirl2 = 0.5 + 0.5 * sin(ang * 5.0 - rn * 14.0 + t * sp * 1.4);
    float body = 1.0 - smoothstep(R - 0.12, R, rn);
    float core = exp(-rn * rn * 5.0);
    float a = m * (body * (0.22 + 0.30 * swirl * swirl2 + 0.35 * core) + edgeBand * 0.9 * (0.6 + 0.4 * swirl));
    float w = core * 0.6 * body + edgeBand * 0.4;
    return vec4(mix(fxColor, vec3(1.0), clamp(w, 0.0, 1.0)), a);
  }`,

  // Ruptura: fendas luminosas nas bordas de células irregulares, avançando do centro.
  rupture: `
  vec4 fx(vec2 p, float rn, float m, float sdf, float pdist, float gw, float extent, float t, float sp, float prog) {
    vec3 v = voro(p * 2.6 + seed);
    float gap = v.y - v.x;
    float crack = 1.0 - smoothstep(0.0, 0.07, gap);
    float halo = 1.0 - smoothstep(0.0, 0.18, gap);
    float g = prog * 1.25;
    float reach = 1.0 - smoothstep(g - 0.15, g, rn + 0.25 * (vnoise(p * 3.0 + seed) - 0.5));
    float pulse = 0.8 + 0.2 * sin(t * sp * 4.0 + v.z * 20.0);
    float a = m * reach * (crack + halo * 0.35) * pulse;
    return vec4(mix(fxColor, vec3(1.0), crack * 0.85), a);
  }`,

  // Descarga: raios que tremem ao longo do contorno do desenho (ou da borda do token), em piscadas.
  discharge: `
  vec4 fx(vec2 p, float rn, float m, float sdf, float pdist, float gw, float extent, float t, float sp, float prog) {
    float tt = floor(t * sp * 12.0);
    float n1 = vnoise(p * 5.0 + vec2(tt * 7.31, tt * 3.17)) - 0.5;
    float n2 = vnoise(p * 11.0 + vec2(tt * 2.7, tt * 9.1)) - 0.5;
    float o1 = 0.16 * abs(n1 * 2.0);
    float o2 = 0.40 * abs(n2 * 2.0);
    float core1 = 1.0 - smoothstep(0.0, 0.03, abs(pdist - o1));
    float core2 = (1.0 - smoothstep(0.0, 0.02, abs(pdist - o2))) * 0.6;
    float glow = exp(-pdist * pdist / (gw * gw)) * 0.45;
    float on = step(0.15, hash(tt + seed));
    float grow = 0.4 + 0.6 * smoothstep(0.0, 0.6, prog);
    float core = max(core1, core2);
    float a = (core * 1.2 + glow) * on * grow;
    return vec4(mix(fxColor, vec3(1.0), clamp(core * 0.9, 0.0, 1.0)), a);
  }`,

  // Dissipação: a região se desfaz por ruído e solta partículas que sobem.
  dissipation: `
  vec4 fx(vec2 p, float rn, float m, float sdf, float pdist, float gw, float extent, float t, float sp, float prog) {
    float n = fbm(p * 2.6 + seed);
    float th = prog * 1.1;
    float solid = smoothstep(th - 0.05, th + 0.05, n);
    float xe = (n - th) / 0.05;
    float edge = exp(-xe * xe);
    vec2 g = p * 9.0 + vec2(0.0, prog * 4.0);
    vec2 cell = floor(g);
    vec2 fr = fract(g) - 0.5;
    float h = hash2(cell + seed);
    vec2 jit = vec2(hash2(cell + 5.0), hash2(cell + 9.0)) - 0.5;
    float dd = length(fr - jit * 0.5);
    float dotv = (1.0 - smoothstep(0.0, 0.16, dd)) * step(0.5, h) * (1.0 - prog) * step(n, th + 0.15);
    float a = m * (solid * (0.10 + 0.38 * n) * (1.0 - prog * 0.6) + edge * 0.8 * (1.0 - prog) + dotv);
    return vec4(mix(fxColor, vec3(1.0), clamp(edge * 0.6 + dotv * 0.5, 0.0, 1.0)), a);
  }`,

  // Corrupção: manchas e veias que se espalham a partir do centro e pulsam.
  corruption: `
  vec4 fx(vec2 p, float rn, float m, float sdf, float pdist, float gw, float extent, float t, float sp, float prog) {
    float R = prog * 1.3;
    float nrm = vnoise(p * 3.0 + seed);
    float reach = 1.0 - smoothstep(R - 0.2, R, rn + 0.35 * (nrm - 0.5));
    float rid = 1.0 - abs(2.0 * fbm(p * 3.4 + seed * 0.7) - 1.0);
    float veins = smoothstep(0.86, 0.97, rid);
    float rid2 = 1.0 - abs(2.0 * fbm(p * 7.0 - seed) - 1.0);
    float veins2 = smoothstep(0.90, 0.985, rid2) * 0.6;
    float blot = smoothstep(0.45, 0.75, fbm(p * 2.0 + seed * 1.3));
    float pulse = 0.5 + 0.5 * sin(rn * 10.0 - t * sp * 3.0);
    float v = veins + veins2;
    float a = m * reach * (blot * 0.40 + v * (0.55 + 0.45 * pulse));
    return vec4(mix(fxColor, vec3(1.0), clamp(v * 0.5 * pulse, 0.0, 1.0)), a);
  }`,

  // Cristalização: facetas que aparecem da borda para dentro, com brilhos pontuais.
  crystal: `
  vec4 fx(vec2 p, float rn, float m, float sdf, float pdist, float gw, float extent, float t, float sp, float prog) {
    vec3 v = voro(p * 3.2 + seed);
    float order = v.z * 0.5 + clamp(-sdf, 0.0, 1.0) * 0.5;
    float appear = smoothstep(order, order + 0.08, prog * 1.25);
    float facet = 0.20 + 0.55 * hash(v.z * 91.0);
    float glint = pow(0.5 + 0.5 * sin(t * sp * 1.5 + v.z * 40.0), 8.0);
    float edgeLine = 1.0 - smoothstep(0.0, 0.06, v.y - v.x);
    float a = m * appear * (facet * 0.6 + edgeLine * 0.9 + glint * 0.5 * facet);
    return vec4(mix(fxColor, vec3(1.0), clamp(edgeLine * 0.7 + glint * 0.5, 0.0, 1.0)), a);
  }`,

  // Rastro residual: manchas fracas e brasas de energia que se apagam devagar (progress = quanto já se apagou).
  residual: `
  vec4 fx(vec2 p, float rn, float m, float sdf, float pdist, float gw, float extent, float t, float sp, float prog) {
    float n = fbm(p * 3.0 + seed + vec2(0.0, -t * sp * 0.15));
    float life = 1.0 - prog;
    vec2 g = p * 10.0 + vec2(0.0, t * sp * 0.6);
    vec2 cell = floor(g);
    vec2 fr = fract(g) - 0.5;
    float h = hash2(cell + seed);
    float tw = 0.5 + 0.5 * sin(t * sp * 3.0 + h * 40.0);
    float ember = (1.0 - smoothstep(0.0, 0.14, length(fr))) * step(0.72, h) * tw;
    float a = m * (smoothstep(0.35, 0.8, n) * 0.35 * life * life + ember * life);
    return vec4(mix(fxColor, vec3(1.0), clamp(ember * 0.6, 0.0, 1.0)), a);
  }`,

  // Eclipse: disco escuro que cresce do centro, com uma coroa de luz em raios na borda.
  eclipse: `
  vec4 fx(vec2 p, float rn, float m, float sdf, float pdist, float gw, float extent, float t, float sp, float prog) {
    float R = smoothstep(0.0, 1.0, prog);
    float body = (1.0 - smoothstep(R - 0.05, R, rn)) * m;
    float x = (rn - R) / 0.07;
    float ang = atan(p.y, p.x);
    float rays = 0.65 + 0.35 * pow(abs(sin(ang * 12.0 + t * sp * 0.3 + seed)), 6.0);
    float corona = exp(-x * x) * step(0.001, R) * rays * m;
    vec3 col = mix(vec3(0.0), fxColor, clamp(corona * 1.4, 0.0, 1.0));
    col = mix(col, vec3(1.0), clamp(corona * 0.5, 0.0, 1.0));
    return vec4(col, max(body * 0.88, corona));
  }`,

  // Selo: anéis e glifos que se desenham em volta, no sentido horário, e depois pulsam.
  seal: `
  vec4 fx(vec2 p, float rn, float m, float sdf, float pdist, float gw, float extent, float t, float sp, float prog) {
    float a0 = atan(p.y, p.x);
    float an = (a0 + 3.14159265) / 6.2831853;
    float drawn = 1.0 - smoothstep(prog * 1.02 - 0.015, prog * 1.02, an);
    float band1 = 1.0 - smoothstep(0.0, 0.025, abs(sdf + 0.14));
    float band2 = 1.0 - smoothstep(0.0, 0.018, abs(sdf + 0.42));
    float N = 24.0;
    float k = floor(an * N);
    float h = hash(k + seed * 3.0);
    float within = fract(an * N);
    float glyph = step(0.55, h) * smoothstep(0.15, 0.25, within) * (1.0 - smoothstep(0.75, 0.85, within));
    float rad = smoothstep(-0.40, -0.30, sdf) * (1.0 - smoothstep(-0.26, -0.16, sdf));
    float glyphs = glyph * rad * (0.35 + 0.65 * step(0.8, h));
    float pulse = 0.75 + 0.25 * sin(t * sp * 2.0 - an * 12.566);
    float a = drawn * (band1 + band2 * 0.7 + glyphs * 0.8) * pulse;
    return vec4(mix(fxColor, vec3(1.0), clamp(band1 * 0.35, 0.0, 1.0)), a);
  }`,

  // Eco: três ondas que se repetem, com tremor, e vão enfraquecendo.
  echo: `
  vec4 fx(vec2 p, float rn, float m, float sdf, float pdist, float gw, float extent, float t, float sp, float prog) {
    float ang = atan(p.y, p.x);
    float sum = 0.0;
    for (int k = 0; k < 3; k++) {
      float fk = float(k);
      float Rk = prog * 2.4 - fk * 0.55;
      float rw = rn + 0.012 * sin(ang * 11.0 + t * sp * 7.0 + fk) + 0.010 * sin(ang * 5.0 - t * sp * 5.0 + fk * 2.0);
      float x = (rw - Rk) / (0.07 + 0.05 * fk);
      sum += exp(-x * x) * clamp(1.0 - Rk / 1.35, 0.0, 1.0) * step(0.0, Rk) * (1.0 - 0.25 * fk);
    }
    float a = m * sum;
    return vec4(mix(fxColor, vec3(1.0), clamp(sum * 0.4, 0.0, 1.0)), a);
  }`,

  // Distorção: faixas claras e escuras onduladas, como o ar tremendo.
  distortion: `
  vec4 fx(vec2 p, float rn, float m, float sdf, float pdist, float gw, float extent, float t, float sp, float prog) {
    float n = vnoise(p * 2.5 + vec2(0.0, -t * sp * 0.8));
    float band = sin(rn * 16.0 + n * 6.0 - t * sp * 3.5 + seed);
    float amp = smoothstep(0.0, 0.35, prog) * (1.0 - smoothstep(0.0, 1.0, rn) * 0.6);
    float a = abs(band) * 0.55 * amp * m;
    vec3 c = mix(vec3(0.0), vec3(1.0), step(0.0, band));
    return vec4(mix(c, fxColor, 0.35), a);
  }`,

  // Vigília: olhos de luz que vão surgindo, piscam e flutuam.
  vigil: `
  vec4 fx(vec2 p, float rn, float m, float sdf, float pdist, float gw, float extent, float t, float sp, float prog) {
    float acc = 0.0;
    float core = 0.0;
    for (int i = 0; i < 6; i++) {
      float fi = float(i);
      vec2 base = vec2(hash(fi * 3.7 + seed) * 1.5 - 0.75, hash(fi * 5.3 + seed + 9.0) * 1.5 - 0.75);
      vec2 drift = vec2(sin(t * sp * 0.25 + fi * 2.1), cos(t * sp * 0.21 + fi * 1.3)) * 0.07;
      vec2 q = (p / max(extent, 0.1) - base - drift) * 4.2;
      float shape = abs(q.y) * 2.4 - max(0.0, 1.0 - q.x * q.x) * 0.9;
      float eye = (1.0 - smoothstep(0.0, 0.15, shape)) * (1.0 - smoothstep(0.80, 0.98, abs(q.x)));
      float pupil = (1.0 - smoothstep(0.0, 0.1, length(vec2(q.x, q.y * 1.6)) - 0.22)) * (1.0 - smoothstep(0.80, 0.98, abs(q.x)));
      float blink = smoothstep(0.0, 0.2, sin(t * sp * 0.7 + fi * 4.0 + seed) + 0.25);
      float appear = smoothstep(fi / 6.0 * 0.7, fi / 6.0 * 0.7 + 0.25, prog);
      acc += (eye * 0.55 + pupil * 0.9) * blink * appear;
      core += pupil * blink * appear;
    }
    float a = m * clamp(acc, 0.0, 1.2);
    return vec4(mix(fxColor, vec3(1.0), clamp(core, 0.0, 1.0)), a);
  }`
};

// "sdf" e "extent" são variáveis da região repassadas como constantes: ver specialShader.
export function specialShader(effect: SpecialId, geometry: string): string {
  const body = EFFECTS[effect] ?? EFFECTS.impact;
  return `
    ${COMMON}
    ${REGION_HELPERS}
    ${body}

    half4 main(float2 coord) {
      float sp = max(speed, 0.05);
      float t = time;
      ${geometry}
      float rn = length(p) / max(extent, 0.1);
      float m = 1.0 - smoothstep(-0.02, 0.03, sdf);
      vec4 r = fx(p, rn, m, sdf, pdist, gw, extent, t, sp, progress);
      float a = clamp(r.a * intensity * fade, 0.0, 1.0);
      // Cor pré-multiplicada pelo alfa: necessário para os modos de mistura funcionarem direito.
      return half4(r.rgb * a, a);
    }
  `;
}
