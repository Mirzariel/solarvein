import { describe, expect, it, vi } from 'vitest';

// Count collector solves: a deterministic proxy for cost (wall time is noisy on a shared machine).
const calls = { sim: 0 };
vi.mock('../../model', async (orig) => {
  const m = (await orig()) as typeof import('../../model');
  return { ...m, simulate: (...a: Parameters<typeof m.simulate>) => (calls.sim++, m.simulate(...a)) };
});

import type { DayScenarioId, RouterStrategy, SystemInputs } from '../contract';
import { DEFAULT_SYSTEM } from '../hotel';
import { tankUaWPerK } from '../tank';
import { simulateSystem, simulateYear } from '../day';

/** The Lab slider extremes (src/sections/ControlPanel.tsx ranges). */
const withTank = (s: SystemInputs, volumeL: number): SystemInputs => ({
  ...s,
  tank: { ...s.tank, volumeL, uaWPerK: tankUaWPerK(volumeL, 0.5) },
});
const EXTREMES: [string, SystemInputs][] = [
  ['default', DEFAULT_SYSTEM],
  ['rooms 5', { ...DEFAULT_SYSTEM, hotel: { ...DEFAULT_SYSTEM.hotel, rooms: 5 } }],
  ['rooms 300', { ...DEFAULT_SYSTEM, hotel: { ...DEFAULT_SYSTEM.hotel, rooms: 300 } }],
  ['occ 0,30', { ...DEFAULT_SYSTEM, hotel: { ...DEFAULT_SYSTEM.hotel, occupancy: 0.3 } }],
  ['occ 0,95', { ...DEFAULT_SYSTEM, hotel: { ...DEFAULT_SYSTEM.hotel, occupancy: 0.95 } }],
  ['litres 30', { ...DEFAULT_SYSTEM, hotel: { ...DEFAULT_SYSTEM.hotel, dhwLitresPerOccupiedRoomDay: 30 } }],
  ['litres 200', { ...DEFAULT_SYSTEM, hotel: { ...DEFAULT_SYSTEM.hotel, dhwLitresPerOccupiedRoomDay: 200 } }],
  ['mains 22', { ...DEFAULT_SYSTEM, hotel: { ...DEFAULT_SYSTEM.hotel, mainsC: 22 } }],
  ['mains 32', { ...DEFAULT_SYSTEM, hotel: { ...DEFAULT_SYSTEM.hotel, mainsC: 32 } }],
  ['modules 10', { ...DEFAULT_SYSTEM, array: { ...DEFAULT_SYSTEM.array, modules: 10 } }],
  ['modules 120', { ...DEFAULT_SYSTEM, array: { ...DEFAULT_SYSTEM.array, modules: 120 } }],
  ['flow 0,5', { ...DEFAULT_SYSTEM, array: { ...DEFAULT_SYSTEM.array, module: { ...DEFAULT_SYSTEM.array.module, flowLpm: 0.5 } } }],
  ['flow 5', { ...DEFAULT_SYSTEM, array: { ...DEFAULT_SYSTEM.array, module: { ...DEFAULT_SYSTEM.array.module, flowLpm: 5 } } }],
  ['tank 1000', withTank(DEFAULT_SYSTEM, 1000)],
  ['tank 12000', withTank(DEFAULT_SYSTEM, 12000)],
  ['onK 3 offK 0,5', { ...DEFAULT_SYSTEM, controller: { ...DEFAULT_SYSTEM.controller, onK: 3, offK: 0.5 } }],
  ['onK 12 offK 6', { ...DEFAULT_SYSTEM, controller: { ...DEFAULT_SYSTEM.controller, onK: 12, offK: 6 } }],
  ['minRegen 35', { ...DEFAULT_SYSTEM, controller: { ...DEFAULT_SYSTEM.controller, desiccantMinRegenC: 35 } }],
  ['minRegen 70', { ...DEFAULT_SYSTEM, controller: { ...DEFAULT_SYSTEM.controller, desiccantMinRegenC: 70 } }],
  ['COP coil 4,5 after 3', { ...DEFAULT_SYSTEM, carbon: { ...DEFAULT_SYSTEM.carbon, coilRefCop: 4.5, aftercoolerCop: 3 } }],
  ['COP coil 2 after 7', { ...DEFAULT_SYSTEM, carbon: { ...DEFAULT_SYSTEM.carbon, coilRefCop: 2, aftercoolerCop: 7 } }],
  [
    'big tank + low demand + hot desiccant',
    {
      ...withTank(DEFAULT_SYSTEM, 12000),
      hotel: { ...DEFAULT_SYSTEM.hotel, rooms: 5, occupancy: 0.3 },
      array: { ...DEFAULT_SYSTEM.array, modules: 120 },
      controller: { ...DEFAULT_SYSTEM.controller, desiccantMinRegenC: 35 },
    },
  ],
];
const SCENARIOS: DayScenarioId[] = ['terik', 'berawan', 'hujan', 'hujan-3-hari'];
const STRATEGIES: RouterStrategy[] = ['dhw-priority', 'fixed-schedule', 'adaptive'];

/** Smallest of n repeats [ms]: the first repeat includes cold caches, later ones are the Lab's typical re-run. */
const time = (f: () => void, n = 4): { cold: number; warm: number } => {
  let cold = 0;
  let warm = Infinity;
  for (let i = 0; i < n; i++) {
    const t0 = performance.now();
    f();
    const dt = performance.now() - t0;
    if (i === 0) cold = dt;
    warm = Math.min(warm, dt);
  }
  return { cold, warm };
};

describe('performance over Lab slider extremes (generous bounds; the targets are 15 ms / 60 ms warm)', () => {
  simulateSystem(DEFAULT_SYSTEM, 'terik'); // JIT warm-up
  simulateYear(DEFAULT_SYSTEM, 'adaptive');

  it('every extreme: 24 h run and annual run stay fast and valid', () => {
    const rows: string[] = [];
    let worstDay = 0;
    let worstYear = 0;
    let worstDayCold = 0;
    let worstDayCalls = 0;
    let worstYearCalls = 0;
    let worstYearCold = 0;
    for (const [name, base] of EXTREMES) {
      // a fresh system object each time, like a slider change (the module object is shared, as in the Lab)
      const sys: SystemInputs = { ...base };
      let day = { cold: 0, warm: 0 };
      for (const sc of SCENARIOS.slice(0, 3)) {
        const t = time(() => simulateSystem(sys, sc, { strategy: 'adaptive' }));
        day = { cold: Math.max(day.cold, t.cold), warm: Math.max(day.warm, t.warm) };
      }
      let year = { cold: 0, warm: 0 };
      for (const st of STRATEGIES) {
        const t = time(() => simulateYear(sys, st));
        year = { cold: Math.max(year.cold, t.cold), warm: Math.max(year.warm, t.warm) };
      }
      worstDay = Math.max(worstDay, day.warm);
      worstYear = Math.max(worstYear, year.warm);
      worstDayCold = Math.max(worstDayCold, day.cold);
      worstYearCold = Math.max(worstYearCold, year.cold);
      calls.sim = 0;
      simulateSystem({ ...base }, 'terik', { strategy: 'adaptive' });
      const dayCalls = calls.sim;
      calls.sim = 0;
      simulateYear({ ...base }, 'adaptive');
      const yearCalls = calls.sim;
      worstDayCalls = Math.max(worstDayCalls, dayCalls);
      worstYearCalls = Math.max(worstYearCalls, yearCalls);
      rows.push(
        `${name.padEnd(40)} day ${day.warm.toFixed(1).padStart(6)} (cold ${day.cold.toFixed(1).padStart(6)}) ms (${dayCalls} solves)  year ${year.warm.toFixed(1).padStart(6)} (cold ${year.cold.toFixed(1).padStart(6)}) ms`,
      );
      const r = simulateSystem(sys, 'terik');
      expect(r.totals.unmetKWhTh).toBe(0);
      expect(Math.abs(r.energyClosureErrorKWh)).toBeLessThan(1e-6);
    }
    console.log(rows.join(String.fromCharCode(10)));
    console.log(`worst: day ${worstDay.toFixed(1)} ms (cold ${worstDayCold.toFixed(1)}), year ${worstYear.toFixed(1)} ms (cold ${worstYearCold.toFixed(1)}), solves day ${worstDayCalls}, year ${worstYearCalls}`);
    // deterministic cost bounds (about 15 ms / 60 ms on a quiet machine) ...
    expect(worstDayCalls).toBeLessThan(800);
    expect(worstYearCalls).toBeLessThan(2500);
    // ... plus generous wall-time bounds that tolerate a busy machine
    expect(worstDay).toBeLessThan(120);
    expect(worstYear).toBeLessThan(300);
    expect(worstDayCold).toBeLessThan(250);
    expect(worstYearCold).toBeLessThan(600);
  }, 120_000);
});
