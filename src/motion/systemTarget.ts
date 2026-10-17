/**
 * v2 visual target: the DayResult stepped at an hour, reduced to what the visual clock needs.
 * Pure (no React, no store): the binding in `src/state/systemEngineBinding.ts` feeds it from the store.
 *
 * The single-module visual inputs are built from the step exactly as the collector sees them:
 *   { ...sys.array.module, irradiance, ambientC, windMs, rainMmH, humidityRatio, inletC: step.collector.inletC,
 *     pumpControl: step.router.pumpOn ? 'on' : 'off' }
 * and are run through simulate(..., 'pvt-liquid') by the engine on every animation step.
 */
import type { SimInputs } from '../sim';
import {
  getSystemView,
  routerSnapshot,
  stepAt,
  type ClimatePoint,
  type DayScenarioId,
  type DayStep,
  type RouterSnapshot,
  type RouterStrategy,
  type SystemInputs,
} from '../sim/system';

export interface SystemTarget {
  /** Single-module collector inputs for this step (pumpControl = the router's pump command). */
  inputs: SimInputs;
  climate: ClimatePoint;
  /** Scenario hours (0..24, or 0..72 for 'hujan-3-hari'). */
  hour: number;
  /** Number of identical modules in the array (array heat = modules x module heat). */
  modules: number;
  /** Router state of the step: discrete state, valves (Σ = 1 when pumpOn) and allocW (array totals). */
  router: RouterSnapshot;
}

export function targetFromStep(sys: SystemInputs, step: DayStep): SystemTarget {
  const c = step.climate;
  return {
    inputs: {
      ...sys.array.module,
      irradiance: c.irradiance,
      ambientC: c.ambientC,
      windMs: c.windMs,
      rainMmH: c.rainMmH,
      humidityRatio: c.humidityRatio,
      inletC: step.collector.inletC,
      pumpControl: step.router.pumpOn ? 'on' : 'off',
    },
    climate: { ...c },
    hour: step.t,
    modules: sys.array.modules,
    router: routerSnapshot(step),
  };
}

/** Target at (scenario, strategy, hour) for a system: cached DayResult (view cache) + interpolated step. */
export function targetAt(sys: SystemInputs, scenario: DayScenarioId, strategy: RouterStrategy, hour: number): SystemTarget {
  const day = getSystemView(sys).day(scenario, strategy);
  return targetFromStep(sys, stepAt(day, hour));
}
