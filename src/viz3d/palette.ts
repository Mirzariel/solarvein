/**
 * Three-free palette + colour maths for the 3D stage (safe for the always-loaded bundle: the SVG
 * Schematic imports it). Values follow docs/audit/05-creative-direction.md section 4.1 / 6.2.
 * DOM chrome should prefer the semantic stage tokens (`--color-stage-*`); these constants are the
 * in-canvas fallbacks and the single source for 3D materials.
 */

export const COLORS = {
  // stage / studio
  background: '#0E1114',
  stage1: '#15191D',
  stageLine: '#262C33',
  floorCentre: '#2C3034',
  floorCentreOvercast: '#262D34',
  ink: '#E9ECEE',
  ink2: '#8D979F',

  // hardware
  glass: '#DDE9EE',
  glassEdge: '#9CC3D6',
  cell: '#14203A',
  cellLine: '#2A3C66',
  busbar: '#8C97B0',
  frame: '#AEB6BE',
  frameDark: '#2A2F36',
  copper: '#C57B45',
  absorber: '#B8C1CC',
  tim: '#4A525C',
  foam: '#3A3E43',
  backsheet: '#2A2E33',
  groove: '#1B1E22',

  // physics colours (stage)
  heat: '#F0A05C',
  cool: '#5FB3D6',
  electric: '#F1EDE4',
  liquidCold: '#5E8FA3',
  liquidMid: '#9AA3A6',
  liquidHot: '#D79A5E',

  // cross-section cut faces (a touch lighter than the surfaces)
  cutGlass: '#9CC3D6',
  cutCell: '#3B4A78',
  cutTim: '#7D8896',
  cutAbsorber: '#D3D9E0',
  cutFoam: '#6B7078',
  cutFrame: '#C9D0D6',
  cutCopper: '#E09A62',
  outline: '#E9ECEE',
} as const;

// ── OKLab ────────────────────────────────────────────────────────────────────────────────────
type Vec3 = [number, number, number];

const srgbToLin = (c: number): number => (c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
const linToSrgb = (c: number): number => (c <= 0.0031308 ? c * 12.92 : 1.055 * Math.pow(c, 1 / 2.4) - 0.055);

export function hexToRgb255(h: string): Vec3 {
  return [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
}

/** sRGB hex -> OKLab [L, a, b]. */
export function hexToOklab(hex: string): Vec3 {
  const [r8, g8, b8] = hexToRgb255(hex);
  const r = srgbToLin(r8 / 255);
  const g = srgbToLin(g8 / 255);
  const b = srgbToLin(b8 / 255);
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ];
}

/** OKLab -> LINEAR sRGB (0..1, clamped). */
export function oklabToLinear(L: number, a: number, b: number): Vec3 {
  const l = Math.pow(L + 0.3963377774 * a + 0.2158037573 * b, 3);
  const m = Math.pow(L - 0.1055613458 * a - 0.0638541728 * b, 3);
  const s = Math.pow(L - 0.0894841775 * a - 1.291485548 * b, 3);
  const c = (v: number): number => (v < 0 ? 0 : v > 1 ? 1 : v);
  return [
    c(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s),
    c(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s),
    c(-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s),
  ];
}

const clamp01 = (x: number): number => (x < 0 ? 0 : x > 1 ? 1 : x);

// ── liquid temperature ramp (cold -> desaturated mid -> hot, interpolated in OKLab) ───────────
const LAB_COLD = hexToOklab(COLORS.liquidCold);
const LAB_MID = hexToOklab(COLORS.liquidMid);
const LAB_HOT = hexToOklab(COLORS.liquidHot);

/** Ramp position 0..1 -> LINEAR sRGB (for three.js colours/vertex colours, which are linear). */
export function rampLinear(s: number): Vec3 {
  const x = clamp01(s);
  const [from, to, t] = x < 0.5 ? [LAB_COLD, LAB_MID, x * 2] : [LAB_MID, LAB_HOT, (x - 0.5) * 2];
  return oklabToLinear(
    from[0] + (to[0] - from[0]) * t,
    from[1] + (to[1] - from[1]) * t,
    from[2] + (to[2] - from[2]) * t,
  );
}

/** Same ramp as an sRGB hex string (for SVG / CSS). */
export function rampHex(s: number): string {
  const [r, g, b] = rampLinear(s);
  const h = (v: number): string =>
    Math.round(clamp01(linToSrgb(v)) * 255)
      .toString(16)
      .padStart(2, '0');
  return `#${h(r)}${h(g)}${h(b)}`;
}

const T_LO = 20; // [deg C] start of the absolute ramp
const T_SPAN = 40;
/**
 * Local gradient contrast so a few kelvin of rise stays legible. COSMETIC: the liquid colour is
 * exaggerated around the loop mean (UI note: "warna diperkuat"), it is not an absolute temperature scale.
 */
export const RAMP_CONTRAST = 4;

/** Ramp position (0..1) for a liquid at `tC` in a loop whose mean temperature is `meanC`. */
export function rampPosition(tC: number, meanC: number): number {
  const sMean = clamp01((meanC - T_LO) / T_SPAN);
  return clamp01(sMean + ((tC - T_LO) / T_SPAN - sMean) * RAMP_CONTRAST);
}

/**
 * Fraction (0..1) of the total inlet->outlet temperature change reached at position `s` (0..1)
 * through the heated serpentine. Uses the sim's own NTU so the profile has the same
 * exponential shape as an isothermal-plate heat exchanger (linear when NTU is tiny).
 */
export function fluidProgress(s: number, ntu: number): number {
  const x = clamp01(s);
  if (!(ntu > 0.02)) return x;
  return (1 - Math.exp(-ntu * x)) / (1 - Math.exp(-ntu));
}

/** Liquid colour (sRGB hex) at temperature `tC` for a loop whose mean temperature is `meanC`. */
export function liquidHex(tC: number, meanC: number): string {
  return rampHex(rampPosition(tC, meanC));
}

const LUT_N = 256;
/** Linear-sRGB lookup of the liquid ramp (256 entries x rgb) for allocation-free per-frame colouring. */
export const RAMP_LUT: Float32Array = (() => {
  const a = new Float32Array(LUT_N * 3);
  for (let i = 0; i < LUT_N; i++) a.set(rampLinear(i / (LUT_N - 1)), i * 3);
  return a;
})();
export const RAMP_LUT_N = LUT_N;
