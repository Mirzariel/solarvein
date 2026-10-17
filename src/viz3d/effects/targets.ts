import type { SimResult } from '../../sim';
import type { ClimatePoint } from '../../sim/system';
import { ARROW } from '../../motion/tokens';
import { clamp01, heatStrength, smoothstep } from './fxMath';

/**
 * v2 optional inputs of a visual frame (weather.ts `VisualFrame.climate` / `.hour`). Both may be absent (v1 frames,
 * tests): every consumer falls back to the SimResult.
 */
export interface FrameExtras {
  climate?: ClimatePoint | undefined;
  hour?: number | undefined;
}

/** Everything the effects need, derived purely from one SimResult (+ a viewer flag + optional v2 climate). */
export interface EffectTargets {
  /** Plane-of-array irradiance [W/m2]. */
  irradiance: number;
  /** Rain drawn on the stage [mm/h]: ONLY from `frame.climate.rainMmH` (never from the v1 SimInputs). */
  rainMmH: number;
  windMs: number;
  pumpOn: boolean;
  /**
   * HARVEST heat cell -> liquid, 0..1: log-ish in the live qLiquidW, 0 when the pump is off, at night or whenever
   * q <= ARROW.flipMinW. Continuous: it fades through 0 (no threshold pop). The ONLY heat the stage ever draws.
   */
  harvest: number;
  /** Live qLiquidW [W] behind `harvest` (0 when there is no harvest). */
  harvestW: number;
  /**
   * Diagnostic only (kept so the v1 physics-review test still reads it): sign of the live qLiquidW whenever the
   * pump runs and |q| > ARROW.flipMinW: -1 harvest, +1 liquid warmer than the cells, 0 none. The renderer NEVER
   * draws +1 (v2 = harvest only; no rejection / reversed arrows).
   */
  stackDir: -1 | 0 | 1;
  stackStrength: number;
  electricalW: number;
  /** 0..1 sunlit-ness from G (and a little less in very humid air). */
  moodSun: number;
  /** 0..1 relative humidity of the sky (flattens the light slightly; never wet glass). */
  moodHumid: number;
  /** 0..1 night (no sun and the clock says so). */
  moodNight: number;
  /** viewer toggle `showHeatArrows` */
  showArrows: boolean;
}

export const makeTargets = (): EffectTargets => ({
  irradiance: 0,
  rainMmH: 0,
  windMs: 0,
  pumpOn: false,
  harvest: 0,
  harvestW: 0,
  stackDir: 0,
  stackStrength: 0,
  electricalW: 0,
  moodSun: 0,
  moodHumid: 0.6,
  moodNight: 0,
  showArrows: true,
});

/** Allocation-free: fills `out` from a result (called once per changed frame). */
export function deriveTargetsInto(out: EffectTargets, r: SimResult, showArrows: boolean, extras?: FrameExtras): EffectTargets {
  const climate = extras?.climate;
  const hour = extras?.hour;
  const q = r.pumpOn ? r.qLiquidW : 0;
  const aq = Math.abs(q);
  const fade = smoothstep(ARROW.fadeFromW, ARROW.fadeToW, aq);

  out.stackDir = r.pumpOn && aq > ARROW.flipMinW ? (q > 0 ? -1 : 1) : 0;
  out.stackStrength = out.stackDir === 0 ? 0 : heatStrength(q) * fade;
  const harvesting = r.pumpOn && q > ARROW.flipMinW;
  out.harvest = harvesting ? heatStrength(q) * fade : 0;
  out.harvestW = harvesting ? q : 0;

  // sky: v2 climate (router-time G, humidity, rain, clock) when the frame carries it, else the collector inputs
  const G = climate ? climate.irradiance : r.inputs.irradiance;
  const rh = climate ? climate.rh : 0.6;
  const dark = clamp01(1 - G / 40);
  const daytime = hour !== undefined && hour > 6.5 && hour < 17.5;
  out.irradiance = r.inputs.irradiance;
  out.rainMmH = climate ? Math.max(0, climate.rainMmH) : 0;
  out.windMs = climate ? climate.windMs : r.inputs.windMs;
  out.pumpOn = r.pumpOn;
  out.electricalW = r.electricalW;
  out.moodHumid = clamp01(rh);
  out.moodSun = clamp01(G / 900) * (1 - 0.25 * clamp01((rh - 0.6) / 0.4));
  out.moodNight = daytime ? 0 : dark;
  out.showArrows = showArrows;
  return out;
}

export function deriveTargets(r: SimResult, showArrows: boolean, extras?: FrameExtras): EffectTargets {
  return deriveTargetsInto(makeTargets(), r, showArrows, extras);
}
