/**
 * v2 selector hooks (lead-owned interface). Views call ONLY these; they never call sim functions directly.
 * Heavy tiers (year, baselines, area sweep) are memoised in the sim view cache (getSystemView, keyed
 * structurally) and read through useDeferredValue so slider drags stay responsive.
 */
import { useDeferredValue, useMemo } from 'react';
import {
  getSystemView,
  routerSnapshot,
  stepAt,
  type AnnualResult,
  type AreaSweepPoint,
  type BaselineComparison,
  type DayResult,
  type DayScenarioId,
  type DayStep,
  type DesiccantEval,
  type HeatUseValue,
  type RegenAirSource,
  type RouterSnapshot,
  type RouterStrategy,
  type SystemInputs,
  type SystemView,
} from '../sim/system';
import { useSystemStore } from './system';

export const useSystem = (): SystemInputs => useSystemStore((s) => s.sys);

/** Memoised view object for the current system (stable identity until inputs change). */
export function useSystemView(): SystemView {
  const sys = useSystemStore((s) => s.sys);
  return useMemo(() => getSystemView(sys), [sys]);
}

/** Same as useSystemView but lags behind rapid edits (for expensive below-the-fold tiers). */
export function useDeferredSystemView(): SystemView {
  const sys = useDeferredValue(useSystemStore((s) => s.sys));
  return useMemo(() => getSystemView(sys), [sys]);
}

export function useDay(scenario?: DayScenarioId, strategy?: RouterStrategy): DayResult {
  const view = useSystemView();
  const sc = useSystemStore((s) => s.scenario);
  const st = useSystemStore((s) => s.strategy);
  return useMemo(() => view.day(scenario ?? sc, strategy ?? st), [view, scenario, sc, strategy, st]);
}

/** Interpolated step at the store hour (cheap lookup into the cached day). */
export function useStep(): DayStep {
  const day = useDay();
  const hour = useSystemStore((s) => s.hour);
  return useMemo(() => stepAt(day, hour), [day, hour]);
}

export function useRouterSnapshot(): RouterSnapshot {
  const step = useStep();
  return useMemo(() => routerSnapshot(step), [step]);
}

export function useYear(strategy?: RouterStrategy): AnnualResult {
  const view = useDeferredSystemView();
  const st = useSystemStore((s) => s.strategy);
  return useMemo(() => view.year(strategy ?? st), [view, strategy, st]);
}

export function useBaselines(): BaselineComparison {
  const view = useDeferredSystemView();
  return useMemo(() => view.baselines(), [view]);
}

export function useAreaSweep(areasM2: number[], strategies: RouterStrategy[]): AreaSweepPoint[] {
  const view = useDeferredSystemView();
  const key = areasM2.join(',') + '|' + strategies.join(',');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(() => view.areaSweep(areasM2, strategies), [view, key]);
}

export function useDesiccantSweep(regenAir?: RegenAirSource, temps?: number[]): DesiccantEval[] {
  const view = useDeferredSystemView();
  const ra = useSystemStore((s) => s.regenAir);
  const key = temps?.join(',') ?? '';
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(() => view.desiccantSweep(regenAir ?? ra, temps), [view, regenAir, ra, key]);
}

export function useHeatUses(): HeatUseValue[] {
  const view = useDeferredSystemView();
  return useMemo(() => view.heatUses(), [view]);
}
