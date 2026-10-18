import type { SimInputs } from './types';

/** Kunci input bertipe angka pada SimInputs. */
export type NumericInputKey = {
  [K in keyof SimInputs]-?: SimInputs[K] extends number ? K : never;
}[keyof SimInputs];

/**
 * Default collector state: clear tropical noon with a hot-water load.
 * T_in 40 °C = realistic return of a DHW preheat loop (30 °C would flatter the result).
 * DEFAULT_SYSTEM (src/sim/system/hotel.ts) builds its module from this; the system engine overwrites the weather,
 * inlet and pump fields at every step.
 */
export const DEFAULT_INPUTS: SimInputs = {
  irradiance: 900,
  ambientC: 32,
  rainMmH: 0,
  windMs: 1.5,
  inletC: 40,
  flowLpm: 2,
  areaM2: 1.7,
  uPlateFluid: 150,
  pressureDropKPa: 20,
  pumpEfficiency: 0.3,
  pumpControl: 'auto',
  etaRef: 0.2,
  betaPerK: 0.0035,
  heatLoadAvailable: true,
  boilerEfficiency: 0.85,
};

/** Valid range of every numeric input (clampInputs, and the system engine's per-input springs). */
export const INPUT_LIMITS: Record<NumericInputKey, { min: number; max: number }> = {
  irradiance: { min: 0, max: 1200 }, //   W/m²
  ambientC: { min: 10, max: 45 }, //      °C
  rainMmH: { min: 0, max: 60 }, //        mm/jam
  windMs: { min: 0, max: 10 }, //         m/s
  inletC: { min: 10, max: 80 }, //        °C
  flowLpm: { min: 0.3, max: 10 }, //      L/mnt
  areaM2: { min: 0.5, max: 4 }, //        m²
  uPlateFluid: { min: 30, max: 600 }, //  W/(m²·K)
  pressureDropKPa: { min: 2, max: 80 }, // kPa @ 2 L/mnt
  pumpEfficiency: { min: 0.1, max: 0.6 },
  etaRef: { min: 0.15, max: 0.24 }, //    efisiensi PV acuan (STC)
  betaPerK: { min: 0.0025, max: 0.005 }, // 1/K
  boilerEfficiency: { min: 0.5, max: 1 },
};
