import type { SimResult } from '../../sim';
import { ARROW } from '../../motion/tokens';
import { clamp01, heatStrength, smoothstep } from './fxMath';

/** Everything the effects need, derived purely from one SimResult (+ a viewer flag). */
export interface EffectTargets {
  /** Plane-of-array irradiance [W/m2]. */
  irradiance: number;
  rainMmH: number;
  windMs: number;
  pumpOn: boolean;
  /**
   * Heat direction between the cell/absorber and the liquid, from the SIGN of the live qLiquidW whenever the
   * pump runs and |q| > ARROW.flipMinW: -1 = down (harvest), +1 = up (rejection), 0 = none.
   * Valuation flags (heat load / hot source) never change direction; they only dim (`stackDim`).
   */
  stackDir: -1 | 0 | 1;
  /** 0..1 amplitude: log-ish in |q|, fading to 0 as |q| -> 0 (continuous, no threshold pop). */
  stackStrength: number;
  /** True when the flow is real but not credited (no heat load / no hot source / not worth the pump). */
  stackDim: boolean;
  /** Heat leaving the glass to the environment: cool while the liquid is rejecting, faint amber otherwise. */
  envTone: 'heat' | 'cool';
  envStrength: number;
  electricalW: number;
  /** 0..1 sunlit-ness (drops with heavy rain / low G). */
  moodSun: number;
  /** 0..1 wetness of the sky. */
  moodRain: number;
  /** viewer toggle `showHeatArrows` */
  showArrows: boolean;
}

export const makeTargets = (): EffectTargets => ({
  irradiance: 0,
  rainMmH: 0,
  windMs: 0,
  pumpOn: false,
  stackDir: 0,
  stackStrength: 0,
  stackDim: false,
  envTone: 'heat',
  envStrength: 0,
  electricalW: 0,
  moodSun: 0,
  moodRain: 0,
  showArrows: true,
});

/** Allocation-free: fills `out` from a result (called once per changed frame). */
export function deriveTargetsInto(out: EffectTargets, r: SimResult, showArrows: boolean): EffectTargets {
  const { irradiance, rainMmH, windMs } = r.inputs;
  const q = r.pumpOn ? r.qLiquidW : 0;
  const aq = Math.abs(q);

  out.stackDir = r.pumpOn && aq > ARROW.flipMinW ? (q > 0 ? -1 : 1) : 0;
  out.stackStrength = out.stackDir === 0 ? 0 : heatStrength(q) * smoothstep(ARROW.fadeFromW, ARROW.fadeToW, aq);
  out.stackDim = r.pumpOn && r.usefulHeatW <= 0 && r.heatRejectedW <= 0;

  const rejecting = r.pumpOn && q < -ARROW.flipMinW;
  const loss = r.qFrontLossW + r.qRainW;
  out.envTone = rejecting ? 'cool' : 'heat';
  out.envStrength = loss > 0 ? heatStrength(loss) * smoothstep(3, 14, loss) : 0;

  const sunny = clamp01(irradiance / 900);
  const wet = clamp01(rainMmH / 25);
  out.irradiance = irradiance;
  out.rainMmH = rainMmH;
  out.windMs = windMs;
  out.pumpOn = r.pumpOn;
  out.electricalW = r.electricalW;
  out.moodSun = sunny * (1 - 0.65 * wet);
  out.moodRain = wet;
  out.showArrows = showArrows;
  return out;
}

export function deriveTargets(r: SimResult, showArrows: boolean): EffectTargets {
  return deriveTargetsInto(makeTargets(), r, showArrows);
}
