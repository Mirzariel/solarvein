/**
 * Motion tokens (single source; mirrored as CSS custom properties in `src/index.css`).
 * Durations are in SECONDS here (GSAP), CSS uses ms.
 */
import type { NumericInputKey } from '../sim';
import { cubicBezier } from './spring';

export const DUR = {
  micro: 0.14, //   hover, focus ring, tooltip fade, press release
  control: 0.18, // buttons, toggle, segmented thumb, slider thumb
  panel: 0.28, //   popovers, disclosures, statement cross-fade
  reveal: 0.9, //   section reveals (opening headline etc.)
  explode: 0.65, // spring, w = 9
  camera: 0.8, //   spring, w = 7.3
  weatherMin: 0.75,
  weatherMax: 1.1,
} as const;

/** CSS easing string (identical to `--ease-ui`) and the same curve as a JS function. */
export const EASE_UI_CSS = 'cubic-bezier(0.22, 1, 0.36, 1)';
export const easeUi = cubicBezier(0.22, 1, 0.36, 1);

/** Text refresh rate of live numbers [Hz]. 3D runs at the display rate. */
export const READOUT_HZ = 15;

/** Spring frequencies [rad/s]. */
export const SPRING_W = {
  camera: 7.3,
  explode: 9,
  /** slider drag -> visual inputs, ~265 ms */
  follow: 22,
  ramp: 3,
} as const;

/** [start, end] of each input's motion as a fraction of the transition, Cerah -> Hujan ("darken"). */
export type Window = readonly [number, number];
export type WindowMap = Partial<Record<NumericInputKey, Window>>;

/**
 * Sequence: the sky darkens and irradiance falls first (P_e follows the model), rain fades in once the sky has begun
 * to close, and the fluid side (T_in, flow) moves in the SAME early stretch as the irradiance drop. Decision (QA D-05):
 * a later T_in window made the cell and outlet temperatures dip up to 3.5 C below BOTH endpoints (a real computed state:
 * G falls while the water is still cold). Overlapping the T_in/flow window with the G window removes the dip
 * (measured 0.00 C, grid search in MOTION_SYSTEM.md section 3).
 */
export const DARKEN_WINDOWS: WindowMap = {
  irradiance: [0, 0.6],
  ambientC: [0.05, 0.7],
  windMs: [0.2, 0.85],
  rainMmH: [0.2, 0.85],
  inletC: [0.1, 0.6],
  flowLpm: [0.1, 0.6],
};
export const DEFAULT_WINDOW: Window = [0, 1];

/** Brighten (Hujan -> Cerah) is the time-mirror: rain stops first, the sky opens last. */
export const mirrorWindows = (w: WindowMap): WindowMap => {
  const out: WindowMap = {};
  for (const k of Object.keys(w) as NumericInputKey[]) {
    const x = w[k];
    if (x) out[k] = [1 - x[1], 1 - x[0]];
  }
  return out;
};
export const BRIGHTEN_WINDOWS: WindowMap = mirrorWindows(DARKEN_WINDOWS);

/** Heat arrows: amplitude ramps between these |q| values [W]; the direction latch needs |q| above FLIP_MIN_W. */
export const ARROW = {
  fadeFromW: 8,
  fadeToW: 36,
  flipMinW: 12,
  /** direction may flip only when the amplitude has faded below this */
  flipAmp: 0.02,
} as const;
