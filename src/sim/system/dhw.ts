/**
 * DHW preheat through an external heat exchanger (W2a).
 *
 * Architecture (binding, plan "Scientific principles" 6): potable water is NEVER stored at 25-45 °C.
 * The collector/buffer loop is closed; heat reaches the potable stream through an external HX during a draw,
 * and the existing heater (≥ 60 °C) always finishes the job. This function is that HX.
 *
 * Evidence: mapan (eps-NTU effectiveness definition); the effectiveness value itself is asumsi.
 */

/** Specific heat of water [J/(kg·K)] (≈ constant over 25-60 °C, ±0,5 %). */
export const WATER_CP_J_PER_KG_K = 4186;
/** Density of water at the mean DHW temperature (~45 °C) [kg/L]. */
export const WATER_RHO_KG_PER_L = 0.99;
/** Default HX effectiveness on the potable side (range 0,6-0,8, asumsi). */
export const DEFAULT_PREHEAT_EFFECTIVENESS = 0.7;

/** Potable-side capacity rate for a draw [W/K]. */
export function drawCapacityWPerK(drawLph: number): number {
  return (Math.max(drawLph, 0) * WATER_RHO_KG_PER_L * WATER_CP_J_PER_KG_K) / 3600;
}

/** Heat needed to take a draw from mains to the setpoint [W_th]. */
export function dhwDemandW(drawLph: number, mainsC: number, setpointC: number): number {
  return drawCapacityWPerK(drawLph) * Math.max(setpointC - mainsC, 0);
}

/**
 * Heat delivered to the potable stream by the external preheat HX [W_th].
 *
 * C_min is the potable (draw) side, so Q = eps · C_draw · (T_source − T_mains).
 * Second law: potable outlet = mains + Q/C_draw ≤ T_source for eps ≤ 1.
 * The preheat never overshoots min(T_source, T_setpoint) (the existing heater takes the rest),
 * is never negative, and is 0 when the draw is 0 or the source is not warmer than the mains.
 */
export function preheatW(
  drawLph: number,
  sourceC: number,
  mainsC: number,
  setpointC: number,
  effectiveness: number = DEFAULT_PREHEAT_EFFECTIVENESS,
): number {
  if (!(drawLph > 0) || !(sourceC > mainsC)) return 0;
  const eps = Math.min(Math.max(effectiveness, 0), 1);
  const c = drawCapacityWPerK(drawLph);
  const q = eps * c * (sourceC - mainsC);
  const cap = c * (Math.min(sourceC, setpointC) - mainsC);
  return Math.max(Math.min(q, cap), 0);
}

/** Potable outlet temperature of the preheat HX [°C]. */
export function preheatOutletC(
  drawLph: number,
  sourceC: number,
  mainsC: number,
  setpointC: number,
  effectiveness: number = DEFAULT_PREHEAT_EFFECTIVENESS,
): number {
  const c = drawCapacityWPerK(drawLph);
  if (!(c > 0)) return mainsC;
  return mainsC + preheatW(drawLph, sourceC, mainsC, setpointC, effectiveness) / c;
}
