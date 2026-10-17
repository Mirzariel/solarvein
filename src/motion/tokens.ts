/**
 * Motion tokens (single source; mirrored as CSS custom properties in `src/index.css`).
 * Durations are in SECONDS here (GSAP), CSS uses ms.
 */
import { cubicBezier } from './spring';

export const DUR = {
  micro: 0.14, //   hover, focus ring, tooltip fade, press release
  control: 0.18, // buttons, toggle, segmented thumb, slider thumb
  panel: 0.28, //   popovers, disclosures, statement cross-fade
  reveal: 0.9, //   section reveals (opening headline etc.)
  explode: 0.65, // spring, w = 9
  camera: 0.8, //   spring, w = 7.3
} as const;

/** CSS easing string (identical to `--ease-ui`) and the same curve as a JS function. */
export const EASE_UI_CSS = 'cubic-bezier(0.22, 1, 0.36, 1)';
export const easeUi = cubicBezier(0.22, 1, 0.36, 1);

/** Text refresh rate of live numbers [Hz]. 3D runs at the display rate. */
export const READOUT_HZ = 15;

/** Heat arrows: amplitude ramps between these |q| values [W]; the direction latch needs |q| above FLIP_MIN_W. */
export const ARROW = {
  fadeFromW: 8,
  fadeToW: 36,
  flipMinW: 12,
  /** direction may flip only when the amplitude has faded below this */
  flipAmp: 0.02,
} as const;

/**
 * v2 system motion (src/motion/systemEngine.ts). Seconds and rad/s.
 *
 * A mode (A/B/C) or scenario change is a scripted ~1,1 s transition made of staggered critically damped springs
 * whose goals are applied at different times (so velocity is kept when the user retargets mid-flight):
 *   climate (G, ambient, RH, wind, rain, clock hour, inlet, tank)  t = 0        w 9,7  settles 0 - 0,6 s (0 - 0,55 T)
 *   router rule / reason / pump command                            t = 0,45 T   (the 0,35 - 0,6 T window)
 *   valves (4 fractions, Σ = 1, rate limited)                      t = 0,40 T   w 8,8  settles 0,44 - 1,1 s (0,4 - 1,0 T)
 *   collected heat Q (scales allocW)                               with the climate; a pump start waits for the switch
 * Real valve actuators take tens of seconds; the stroke is compressed ~30x so the router reads as one gesture.
 * Hour scrubbing is NOT scripted: every goal is applied at once and follows with w = 22 (valves w = 9).
 */
export const SYSTEM_MOTION = {
  transition: 1.1,
  climateW: 9.7,
  switchAt: 0.45,
  valveFrom: 0.4,
  valveW: 8.8,
  /** max valve speed [fraction/s] (full stroke in >= 0,33 s) */
  valveVmax: 3,
  openW: 12,
  followW: 22,
  followValveW: 9,
} as const;
