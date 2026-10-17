import { describe, expect, it } from 'vitest';
import { DEFAULT_SYSTEM, simulateSystem, type DayScenarioId } from '../../sim/system';
import { dayFlows } from './flowModel';

const SCENARIOS: DayScenarioId[] = ['terik', 'berawan', 'hujan', 'hujan-3-hari'];

describe('dayFlows (Lab energy ledger)', () => {
  for (const sc of SCENARIOS) {
    it(`${sc}: ledger is non-negative and the tank first law closes`, () => {
      const day = simulateSystem(DEFAULT_SYSTEM, sc);
      const f = dayFlows(DEFAULT_SYSTEM, day);
      for (const v of [f.radiantKWh, f.pvKWhE, f.heatKWhTh, f.otherKWh, f.directKWhTh, f.toTankKWhTh, f.regenKWhTh, f.bypassKWhTh]) {
        expect(v).toBeGreaterThanOrEqual(-1e-9);
      }
      // radiant input splits into PV electricity, heat in the liquid and the remainder (a difference)
      expect(f.pvKWhE + f.heatKWhTh + f.otherKWh).toBeCloseTo(f.radiantKWh, 6);
      // tank: accepted charge - delivered - standing loss = change of stored heat
      expect(f.toTankKWhTh - f.tankToDhwKWhTh - f.tankLossKWhTh - f.tankDeltaKWhTh).toBeCloseTo(0, 1);
      // DHW: solar + backup = demand (service guarantee)
      expect(f.solarKWhTh + f.backupKWhTh).toBeCloseTo(f.demandKWhTh, 6);
      // the router destinations attribute the collected heat (reported residual, see test below)
      expect(Math.abs(f.routerResidualKWhTh)).toBeLessThan(0.02 * Math.max(1, f.heatKWhTh));
    });
  }
});
