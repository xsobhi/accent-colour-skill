// Colour maths for the accent tool, no dependencies.
// OKLCH (Björn Ottosson's OKLab) for picking and comparing colours - its lightness and hue
// behave the way eyes do - and WCAG 2 relative luminance for contrast, which is what the
// accessibility rules are written against.

const clamp01 = (x) => Math.min(1, Math.max(0, x));
const toLinear = (c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const toGamma = (c) => (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055);

export function parseHex(hex) {
  const m = String(hex).trim().replace(/^#/, "");
  const full = m.length === 3 ? [...m].map((c) => c + c).join("") : m;
  if (!/^[0-9a-f]{6}$/i.test(full)) throw new Error(`not a hex colour: ${hex}`);
  return [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16) / 255);
}

export function toHex([r, g, b]) {
  return "#" + [r, g, b].map((c) => Math.round(clamp01(c) * 255).toString(16).padStart(2, "0")).join("").toUpperCase();
}

function linearToOklab([r, g, b]) {
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ];
}

function oklabToLinear([L, a, b]) {
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ];
}

/** hex -> { L 0..1, C 0..~0.37, h degrees } */
export function hexToOklch(hex) {
  const [L, a, b] = linearToOklab(parseHex(hex).map(toLinear));
  const C = Math.hypot(a, b);
  const h = C < 1e-4 ? 0 : (Math.atan2(b, a) * 180 / Math.PI + 360) % 360;
  return { L, C, h };
}

function oklchToLinear({ L, C, h }) {
  const r = h * Math.PI / 180;
  return oklabToLinear([L, C * Math.cos(r), C * Math.sin(r)]);
}

const inGamut = (lin) => lin.every((c) => c >= -1e-4 && c <= 1 + 1e-4);

/** The most chroma sRGB can show at this lightness and hue (binary search). */
export function maxChroma(L, h) {
  let lo = 0, hi = 0.4;
  for (let i = 0; i < 24; i++) {
    const mid = (lo + hi) / 2;
    if (inGamut(oklchToLinear({ L, C: mid, h }))) lo = mid; else hi = mid;
  }
  return lo;
}

/** OKLCH -> hex, pulling chroma in until the colour fits sRGB (hue and lightness kept). */
export function oklchToHex({ L, C, h }) {
  const c = Math.min(C, maxChroma(L, h));
  return toHex(oklchToLinear({ L, C: c, h }).map((x) => toGamma(clamp01(x))));
}

export function luminance(hex) {
  const [r, g, b] = parseHex(hex).map(toLinear);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** WCAG 2 contrast ratio, 1..21. */
export function contrast(a, b) {
  const [x, y] = [luminance(a), luminance(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
}

/** Perceptual distance in OKLab (0.02 ~ just noticeable, 0.1+ clearly different). */
export function deltaE(a, b) {
  const p = linearToOklab(parseHex(a).map(toLinear));
  const q = linearToOklab(parseHex(b).map(toLinear));
  return Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]);
}

/** Smallest angle between two hues, 0..180. */
export const hueGap = (a, b) => { const d = Math.abs(a - b) % 360; return d > 180 ? 360 - d : d; };

/** Warm (+1) .. cool (-1): oranges and reds are warm, blues and cyans cool. */
export const warmth = (h) => Math.cos((h - 50) * Math.PI / 180);

const NAMES = [[20, "red"], [45, "red-orange"], [70, "orange"], [100, "yellow"], [130, "lime"], [160, "green"],
  [195, "teal"], [235, "cyan"], [275, "blue"], [300, "violet"], [330, "purple"], [350, "magenta"], [360, "red"]];
export const hueName = (h) => NAMES.find(([edge]) => h < edge)[1];
