import { clampInputs, simulate } from './model';
import { DEFAULT_INPUTS } from './presets';
import type { SimResult } from './types';

/**
 * The single-module REFERENCE state of the "Sistem dalam" walk-through and the inspect stage's part labels:
 * clear noon (900 W/m², 32 °C, loop inlet 40 °C), pump on 'auto' (it runs because the heat has a use).
 * Static on purpose: the walk-through explains the hardware at one stated condition; the live, scrolling
 * numbers come from the system engine (src/motion/engine.ts), not from here.
 */
let memo: SimResult | undefined;
export function referenceResult(): SimResult {
  return (memo ??= simulate(clampInputs(DEFAULT_INPUTS), 'pvt-liquid'));
}
