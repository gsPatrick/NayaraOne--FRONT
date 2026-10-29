// Contraste WCAG 2.1 (M9-D851 §3.4): razão de luminância entre duas cores, com composição de cores translúcidas sobre o fundo.
// Lógica pura, usada pelo teste dos tokens de cor (test/m9d851.contraste.test.mjs) e por qualquer verificação futura.

export function parseColor(text) {
  const value = String(text).trim().toLowerCase();
  let match = /^#([0-9a-f]{3})$/.exec(value);
  if (match) return { r: parseInt(match[1][0] + match[1][0], 16), g: parseInt(match[1][1] + match[1][1], 16), b: parseInt(match[1][2] + match[1][2], 16), a: 1 };
  match = /^#([0-9a-f]{6})$/.exec(value);
  if (match) return { r: parseInt(match[1].slice(0, 2), 16), g: parseInt(match[1].slice(2, 4), 16), b: parseInt(match[1].slice(4, 6), 16), a: 1 };
  match = /^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([\d.]+)\s*)?\)$/.exec(value);
  if (match) return { r: Number(match[1]), g: Number(match[2]), b: Number(match[3]), a: match[4] === undefined ? 1 : Number(match[4]) };
  throw new Error(`cor não reconhecida: ${text}`);
}

/** Compõe a cor (com alfa) sobre um fundo opaco. */
export function over(foreground, background) {
  const f = typeof foreground === "string" ? parseColor(foreground) : foreground;
  const b = typeof background === "string" ? parseColor(background) : background;
  const a = f.a;
  return { r: Math.round(f.r * a + b.r * (1 - a)), g: Math.round(f.g * a + b.g * (1 - a)), b: Math.round(f.b * a + b.b * (1 - a)), a: 1 };
}

function channel(value) {
  const v = value / 255;
  return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
}

export function luminance(color) {
  const c = typeof color === "string" ? parseColor(color) : color;
  return 0.2126 * channel(c.r) + 0.7152 * channel(c.g) + 0.0722 * channel(c.b);
}

/** Razão de contraste (1 a 21) entre texto e fundo; cores translúcidas são compostas sobre `canvas`. */
export function contrastRatio(foreground, background, canvas = "#ffffff") {
  const bg = over(typeof background === "string" ? parseColor(background) : background, canvas);
  const fg = over(typeof foreground === "string" ? parseColor(foreground) : foreground, bg);
  const [light, dark] = [luminance(fg), luminance(bg)].sort((a, b) => b - a);
  return (light + 0.05) / (dark + 0.05);
}

export const MIN_TEXT = 4.5;
export const MIN_LARGE_TEXT = 3;
export const MIN_COMPONENT = 3;

/** Lê as variáveis CSS de um bloco (`:root { --x: valor; }`) em um mapa. */
export function readTokens(css, selector = ":root") {
  const start = css.indexOf(`${selector} {`);
  if (start < 0) return {};
  const end = css.indexOf("\n}", start);
  const out = {};
  for (const match of css.slice(start, end).matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) out[match[1]] = match[2].trim().replace(/\s*\/\*.*$/, "");
  return out;
}

/** Resolve var(--x) (recursivo) usando o mapa de tokens. */
export function resolveToken(tokens, value, depth = 0) {
  const match = /^var\((--[\w-]+)\)$/.exec(String(value).trim());
  if (!match) return String(value).trim();
  if (depth > 8 || !(match[1] in tokens)) throw new Error(`token não resolvido: ${value}`);
  return resolveToken(tokens, tokens[match[1]], depth + 1);
}
