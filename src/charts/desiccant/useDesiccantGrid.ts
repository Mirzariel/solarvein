import { useDeferredValue, useMemo } from 'react';
import { desiccantInputFor, getSystemView, MODE_TARGETS, type RegenAirSource, type SystemInputs } from '../../sim/system';
import type { DesiccantEvalDetail } from '../../sim/system/desiccant';
import { useSystem } from '../../state/systemSelectors';

/** After-cooler / reference-coil COP ratios offered by the sensitivity control. */
export const COP_RATIOS = [1.3, 1.5, 2.0] as const;
export type CopRatio = (typeof COP_RATIOS)[number];
export const REGEN_AIRS: readonly RegenAirSource[] = ['ambient', 'exhaust'];

export type DesiccantGrid = Record<RegenAirSource, Record<string, DesiccantEvalDetail[]>>;

export const ratioKey = (r: number): string => r.toFixed(1);

/** The same system with the after-cooler COP set to `ratio` × the reference-coil COP (nothing else changes). */
const withRatio = (sys: SystemInputs, ratio: number): SystemInputs => ({
  ...sys,
  carbon: { ...sys.carbon, aftercoolerCop: ratio * sys.carbon.coilRefCop },
});

/**
 * Regeneration-temperature sweeps (35–70 °C) for both regeneration-air sources at every COP ratio. Each one is a
 * cached `desiccantSweep` of the sim view (its key includes aftercoolerCop), so this costs 6 small evaluations once.
 * Standalone sweeps carry no PV penalty / pump power: the net is an upper bound (the sim's own note says so).
 */
export function useDesiccantGrid(): { grid: DesiccantGrid; temps: number[]; sys: SystemInputs } {
  const sys = useDeferredValue(useSystem());
  return useMemo(() => {
    const grid = { ambient: {}, exhaust: {} } as DesiccantGrid;
    for (const air of REGEN_AIRS) {
      for (const r of COP_RATIOS) grid[air][ratioKey(r)] = getSystemView(withRatio(sys, r)).desiccantSweep(air);
    }
    const temps = (grid.ambient[ratioKey(COP_RATIOS[0])] ?? []).map((e) => e.regenC);
    return { grid, temps, sys };
  }, [sys]);
}

/** Condition the sweeps are evaluated at (MODE_TARGETS.A): outdoor air state used as process (and ambient regeneration) air. */
export function sweepCondition(sys: SystemInputs) {
  const t = MODE_TARGETS.A;
  const i = desiccantInputFor(sys, t.scenario, t.hour, 'ambient');
  return { scenario: t.scenario, hour: t.hour, ambientC: i.ambient.ambientC, rh: i.ambient.rh };
}
