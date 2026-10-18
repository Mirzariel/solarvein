/**
 * Heat pump with the PV/T fluid loop as source (research option, evaluated against B2) (W2a).
 * COP = carnotFraction × T_cond,K / (T_cond − T_evap), with evaporator and condenser approach temperatures.
 * Evidence: mapan (Carnot relation); carnotFraction is asumsi (0,4-0,5 typical for small water-source units).
 */

/** Evaporator approach: refrigerant evaporates this far BELOW the source-fluid temperature [K] (plate HX, asumsi). */
export const EVAP_APPROACH_K = 3;
/** Condenser approach: refrigerant condenses this far ABOVE the sink-water temperature [K] (plate HX, asumsi). */
export const COND_APPROACH_K = 3;
/** Practical COP ceiling for very small lifts [-]. */
export const COP_MAX = 10;

/** Carnot COP (heating) between refrigerant temperatures, with a minimum lift of 1 K. */
export function carnotCopHeating(evapC: number, condC: number): number {
  const lift = Math.max(condC - evapC, 1);
  return (condC + 273.15) / lift;
}

/**
 * Real heating COP for a source at `sourceC` heating a sink at `sinkC`.
 * Clamped to [1, COP_MAX]. Never exceeds carnotFraction × Carnot of the SAME refrigerant temperatures.
 */
export function heatPumpCop(sourceC: number, sinkC: number, carnotFraction: number): number {
  const evapC = sourceC - EVAP_APPROACH_K;
  const condC = sinkC + COND_APPROACH_K;
  const cop = Math.max(carnotFraction, 0) * carnotCopHeating(evapC, condC);
  return Math.min(Math.max(cop, 1), COP_MAX);
}

/**
 * Work and source heat for a condenser output.
 * workWe = Q_cond / COP (electricity); sourceW = Q_cond − work (heat drawn from the PV/T loop), never negative.
 */
export function heatPumpWork(condenserW: number, cop: number): { workWe: number; sourceW: number } {
  const q = Math.max(condenserW, 0);
  const c = Math.max(cop, 1);
  const workWe = q / c;
  return { workWe, sourceW: Math.max(q - workWe, 0) };
}
