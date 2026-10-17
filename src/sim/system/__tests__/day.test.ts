import { describe, expect, it } from 'vitest';
import type { DayResult, DayScenarioId, RouterStrategy, Sink, SystemInputs } from '../contract';
import { DEFAULT_SYSTEM } from '../hotel';
import { areaSweep, baselineInputs, simulateSystem, simulateYear, type DayStepDetail } from '../day';
import { ANNUAL_DAY_WEIGHTS, DAY_ASSUMPTIONS } from '../assumptions/day';
import { compareBaselines } from '../carbon';
import { carnotCopHeating, COND_APPROACH_K, EVAP_APPROACH_K } from '../heatpump';
import { evaluateDesiccant } from '../desiccant';

const SYS = DEFAULT_SYSTEM; // 2 L/min per module; differential thermostat starts the pump from the pump-off sensor
const SCENARIOS: DayScenarioId[] = ['terik', 'berawan', 'hujan', 'hujan-3-hari'];
const STRATEGIES: RouterStrategy[] = ['dhw-priority', 'fixed-schedule', 'adaptive'];
const SINKS: Sink[] = ['dhw', 'tank', 'desiccant', 'bypass'];

const run = (sys: SystemInputs, sc: DayScenarioId, strategy: RouterStrategy = 'adaptive'): DayResult =>
  simulateSystem(sys, sc, { strategy });

describe('simulateSystem: service guarantee and balances', () => {
  for (const sys of [SYS]) {
    for (const sc of SCENARIOS) {
      for (const st of STRATEGIES) {
        it(`unmet = 0 and solar + backup = demand per step (${sc}, ${st}, flow ${sys.array.module.flowLpm})`, () => {
          const r = run(sys, sc, st);
          expect(r.steps.length).toBe(sc === 'hujan-3-hari' ? 288 : 96);
          expect(r.totals.unmetKWhTh).toBe(0);
          for (const s of r.steps) {
            expect(s.dhw.unmetW).toBe(0);
            expect(s.dhw.backupW).toBeGreaterThanOrEqual(0);
            expect(s.dhw.fromCollectorW + s.dhw.fromTankW + s.dhw.backupW).toBeCloseTo(s.dhw.demandW, 6);
          }
          expect(r.totals.dhwSolarKWhTh + r.totals.dhwBackupKWhTh).toBeCloseTo(r.totals.dhwDemandKWhTh, 6);
          expect(r.totals.solarFraction).toBeGreaterThanOrEqual(0);
          expect(r.totals.solarFraction).toBeLessThanOrEqual(1);
        });
      }
    }
  }

  it('daily DHW demand equals the hotel daily heat need', () => {
    const r = run(SYS, 'terik');
    // 70 occupied rooms x 80 L = 5600 L from 28 to 60 C
    expect(r.totals.dhwDemandKWhTh).toBeGreaterThan(200);
    expect(r.totals.dhwDemandKWhTh).toBeLessThan(215);
  });

  it('allocation conservation per step: sum alloc = collector heat when the pump runs, valves sum to 1', () => {
    for (const sc of SCENARIOS) {
      for (const st of STRATEGIES) {
        const r = run(SYS, sc, st);
        for (const s of r.steps) {
          const sum = SINKS.reduce((a, k) => a + s.router.allocW[k], 0);
          const vsum = SINKS.reduce((a, k) => a + s.router.valves[k], 0);
          for (const k of SINKS) expect(s.router.allocW[k]).toBeGreaterThanOrEqual(0);
          if (s.router.pumpOn) {
            expect(Math.abs(sum - s.collector.qLiquidW)).toBeLessThanOrEqual(1e-9 * Math.max(1, s.collector.qLiquidW));
            expect(Math.abs(vsum - 1)).toBeLessThanOrEqual(1e-9);
          } else {
            expect(sum).toBe(0);
          }
        }
        const dt = r.dtH;
        const allocKWh = r.steps.reduce((a, s) => a + SINKS.reduce((b, k) => b + s.router.allocW[k], 0) * dt, 0) / 1000;
        expect(allocKWh).toBeCloseTo(r.totals.collectedKWhTh, 6);
      }
    }
  });

  it('tank first law closes (error < 0,5 % of throughput)', () => {
    for (const sc of SCENARIOS) {
      for (const st of STRATEGIES) {
        const r = run(SYS, sc, st);
        const throughput = Math.max(r.totals.dhwSolarKWhTh + r.totals.tankLossKWhTh, 1);
        expect(Math.abs(r.energyClosureErrorKWh)).toBeLessThan(0.005 * throughput);
        expect(Math.abs(r.energyClosureErrorKWh)).toBeLessThan(1e-6);
      }
    }
  });

  it('is deterministic', () => {
    expect(run(SYS, 'berawan')).toEqual(run(SYS, 'berawan'));
  });
});

describe('simulateSystem: safe controller and modes', () => {
  it('mode C (and night) means no collection and no pump power', () => {
    for (const sc of SCENARIOS) {
      const r = run(SYS, sc);
      for (const s of r.steps) {
        if (s.router.mode === 'C') {
          expect(s.router.pumpOn).toBe(false);
          expect(s.collector.qLiquidW).toBe(0);
          expect(s.collector.pumpW).toBe(0);
          expect(SINKS.every((k) => s.router.allocW[k] === 0)).toBe(true);
        }
        if (s.climate.irradiance === 0) {
          expect(s.router.mode).toBe('C');
          expect(s.collector.qLiquidW).toBe(0);
          expect(s.collector.electricalW).toBe(0);
        }
      }
    }
  });

  it('a running pump always has an outlet warmer than the inlet; otherwise no heat flows', () => {
    for (const sc of SCENARIOS) {
      const r = run(SYS, sc);
      for (const s of r.steps) {
        if (s.router.pumpOn) {
          expect(s.collector.outletC).toBeGreaterThan(s.collector.inletC);
          expect(s.collector.qLiquidW).toBeGreaterThan(0);
        } else {
          expect(s.collector.qLiquidW).toBe(0);
          expect(s.collector.pumpW).toBe(0);
          expect(s.router.allocW.tank).toBe(0);
        }
      }
    }
  });

  it('modes A, B and C are conditions: B steps are daylight without useful collection', () => {
    const r = run(SYS, 'berawan');
    const modes = new Set(r.steps.map((s) => s.router.mode));
    expect(modes.has('A')).toBe(true);
    expect(modes.has('C')).toBe(true);
    for (const s of r.steps) if (s.router.mode === 'B') expect(s.climate.irradiance).toBeGreaterThanOrEqual(20);
  });

  it('PV still produces when the pump is off (hotter cells) and nothing at night', () => {
    const r = run(SYS, 'hujan');
    const day = r.steps.filter((s) => s.climate.irradiance > 50);
    expect(day.length).toBeGreaterThan(5);
    for (const s of day) expect(s.collector.electricalW).toBeGreaterThan(0);
  });
});

describe('differential thermostat (2 L/min per module)', () => {
  it('a clear day collects substantial heat with the default 2 L/min flow', () => {
    expect(SYS.array.module.flowLpm).toBe(2);
    const r = run(SYS, 'terik');
    expect(r.totals.collectedKWhTh).toBeGreaterThan(80);
    expect(r.totals.solarFraction).toBeGreaterThan(0.3);
    expect(r.steps.some((s) => s.router.pumpOn)).toBe(true);
  });

  it('a cold collector never starts the pump (hot tank, diffuse light): no tank cooling', () => {
    const hot = { topC: 75, bottomC: 75, soc: 1, lossW: 0 };
    const r = simulateSystem(SYS, 'hujan', { initialTank: hot, warmUpDays: 0 });
    for (const s of r.steps) {
      expect(s.router.pumpOn).toBe(false);
      expect(s.collector.qLiquidW).toBe(0);
    }
    expect(r.totals.collectedKWhTh).toBe(0);
  });

  it('no rapid pump cycling on a cloudy day (at most 6 starts)', () => {
    const r = run(SYS, 'berawan');
    let starts = 0;
    let prev = false;
    for (const s of r.steps) {
      if (s.router.pumpOn && !prev) starts++;
      prev = s.router.pumpOn;
    }
    expect(starts).toBeLessThanOrEqual(6);
    expect(starts).toBeGreaterThan(0);
  });

  it('desiccant fans are not in the parasitic total (pumps only)', () => {
    const r = run(SYS, 'terik', 'fixed-schedule');
    const pumpKWh = r.steps.reduce((a, s) => a + s.collector.pumpW * r.dtH, 0) / 1000;
    expect(r.totals.parasiticKWhE).toBeCloseTo(pumpKWh, 9);
  });
});

describe('DHW chain second law', () => {
  for (const sc of SCENARIOS) {
    for (const st of STRATEGIES) {
      it(`potable outlet never exceeds the hottest source or the setpoint (${sc}, ${st})`, () => {
        const r = run(SYS, sc, st);
        for (const s of r.steps as DayStepDetail[]) {
          const solar = s.dhw.fromCollectorW + s.dhw.fromTankW;
          if (solar <= 0) continue;
          expect(s.dhw.potableOutC).toBeLessThanOrEqual(Math.max(s.dhw.tankSourceC, s.dhw.collectorSourceC) + 1e-9);
          expect(s.dhw.potableOutC).toBeLessThanOrEqual(SYS.hotel.dhwSetpointC + 1e-9);
          expect(s.dhw.potableOutC).toBeGreaterThanOrEqual(SYS.hotel.mainsC - 1e-9);
        }
      });
    }
  }

  it('also holds from a hot start tank', () => {
    const hot = { topC: 58, bottomC: 52, soc: 1, lossW: 0 };
    const r = simulateSystem(SYS, 'berawan', { initialTank: hot, warmUpDays: 0 });
    for (const s of r.steps as DayStepDetail[]) {
      if (s.dhw.fromCollectorW + s.dhw.fromTankW > 0) {
        expect(s.dhw.potableOutC).toBeLessThanOrEqual(Math.max(s.dhw.tankSourceC, s.dhw.collectorSourceC) + 1e-9);
      }
    }
  });
});

describe('simulateSystem: scenarios', () => {
  it('rainy days are not zero-sun but yield much less solar heat than clear days', () => {
    const terik = run(SYS, 'terik');
    const hujan = run(SYS, 'hujan');
    expect(Math.max(...hujan.steps.map((s) => s.climate.irradiance))).toBeGreaterThan(100);
    expect(hujan.totals.dhwSolarKWhTh).toBeLessThan(terik.totals.dhwSolarKWhTh);
    expect(terik.totals.solarFraction).toBeGreaterThan(0.25);
  });

  it('72 h of rain: solar fraction falls and backup rises vs a clear day, service unaffected', () => {
    const terik = run(SYS, 'terik');
    const rain = run(SYS, 'hujan-3-hari');
    expect(rain.totals.solarFraction).toBeLessThan(terik.totals.solarFraction);
    expect(rain.totals.dhwBackupKWhTh / rain.totals.dhwDemandKWhTh).toBeGreaterThan(
      terik.totals.dhwBackupKWhTh / terik.totals.dhwDemandKWhTh,
    );
    expect(rain.totals.unmetKWhTh).toBe(0);
    const perDay = [0, 1, 2].map((d) => {
      const st = rain.steps.filter((s) => s.t >= d * 24 && s.t < (d + 1) * 24);
      const sol = st.reduce((a, s) => a + s.dhw.fromCollectorW + s.dhw.fromTankW, 0);
      const dem = st.reduce((a, s) => a + s.dhw.demandW, 0);
      return sol / dem;
    });
    expect(perDay[1]).toBeLessThanOrEqual(perDay[0]! + 1e-9);
  });

  it('72 h scenario spans t = 0..72 at step midpoints', () => {
    const r = run(SYS, 'hujan-3-hari');
    expect(r.steps[0]!.t).toBeCloseTo(0.125, 9);
    expect(r.steps.at(-1)!.t).toBeCloseTo(72 - 0.125, 9);
  });

  it('strategies differ plausibly: the naive schedule wastes DHW heat', () => {
    const dhw = simulateYear(SYS, 'dhw-priority');
    const fixed = simulateYear(SYS, 'fixed-schedule');
    const adaptive = simulateYear(SYS, 'adaptive');
    expect(adaptive.totals.dhwSolarKWhTh).toBeGreaterThanOrEqual(fixed.totals.dhwSolarKWhTh);
    expect(dhw.totals.dhwSolarKWhTh).toBeGreaterThanOrEqual(fixed.totals.dhwSolarKWhTh);
    expect(adaptive.totals.dhwSolarKWhTh).toBeGreaterThanOrEqual(dhw.totals.dhwSolarKWhTh - 1e-6);
    expect(fixed.totals.desiccantRegenKWhTh).toBeGreaterThan(0);
    expect(dhw.totals.desiccantRegenKWhTh).toBe(0);
  });
});

describe('desiccant path (W3 wired)', () => {
  it('fixed-schedule sends heat to the desiccant; capacity stays in [0,1]; moisture is non-negative', () => {
    const r = run(SYS, 'terik', 'fixed-schedule');
    expect(r.totals.desiccantRegenKWhTh).toBeGreaterThan(0);
    for (const s of r.steps) {
      expect(s.desiccant.capacity).toBeGreaterThanOrEqual(0);
      expect(s.desiccant.capacity).toBeLessThanOrEqual(1);
      expect(s.desiccant.moistureRemovedKgH).toBeGreaterThanOrEqual(0);
      expect(s.desiccant.regenW).toBeGreaterThanOrEqual(0);
    }
  });

  it('refWe equals evaluateDesiccant coilRefWe; with no moisture removed the coil does everything', () => {
    const r = run(SYS, 'terik', 'dhw-priority');
    const s = r.steps[48]!;
    const ev = evaluateDesiccant({
      regenC: 50,
      process: { tC: s.climate.ambientC, humidityRatio: s.climate.humidityRatio },
      regenAir: SYS.desiccant.regenAir,
      ambient: s.climate,
      params: SYS.desiccant,
      hotel: SYS.hotel,
      carbon: SYS.carbon,
    });
    expect(s.hvac.refWe).toBeGreaterThan(0);
    expect(s.hvac.refWe).toBeCloseTo(ev.hvac.coilRefWe, 6);
    for (const x of r.steps) {
      if (x.desiccant.moistureRemovedKgH === 0) expect(x.hvac.withDesiccantWe).toBeCloseTo(x.hvac.refWe, 6);
    }
  });

  it('disabled desiccant: no heat, moisture or HVAC change', () => {
    const off: SystemInputs = { ...SYS, desiccant: { ...SYS.desiccant, enabled: false } };
    for (const st of STRATEGIES) {
      const r = run(off, 'terik', st);
      expect(r.totals.desiccantRegenKWhTh).toBe(0);
      expect(r.totals.moistureRemovedKg).toBe(0);
      expect(r.totals.hvacSavedKWhE).toBe(0);
    }
  });
});

/** Little hot-water demand and a big array: the tank cannot absorb the heat (surplus). */
const SURPLUS: SystemInputs = { ...SYS, hotel: { ...SYS.hotel, occupancy: 0.05 } };
/** Optimistic desiccant assumptions (exhaust regeneration air, after-cooler COP 6 vs coil 3): the value gate can pass. */
const SURPLUS_OPT: SystemInputs = {
  ...SURPLUS,
  desiccant: { ...SURPLUS.desiccant, regenAir: 'exhaust' },
  carbon: { ...SURPLUS.carbon, aftercoolerCop: 6, coilRefCop: 3 },
};

describe('surplus: router acceptance, bypass and the value-gated desiccant', () => {
  it('a tank that cannot accept heat bypasses it (dry-cooler return) instead of silently stopping', () => {
    const y = simulateYear(SURPLUS, 'dhw-priority');
    expect(y.totals.bypassKWhTh).toBeGreaterThan(1000);
    const d = run(SURPLUS, 'terik', 'dhw-priority');
    expect(d.steps.some((s) => s.router.allocW.bypass > 0)).toBe(true);
    for (const s of d.steps) {
      if (s.router.pumpOn) expect(s.collector.inletC).toBeLessThanOrEqual(s.tank.bottomC + 1e-6);
      expect(SINKS.reduce((a, k) => a + s.router.allocW[k], 0)).toBeCloseTo(s.collector.qLiquidW, 6);
    }
    expect(d.totals.unmetKWhTh).toBe(0);
  });

  it('dhw-priority never sends heat to the desiccant, also in surplus', () => {
    expect(simulateYear(SURPLUS, 'dhw-priority').totals.desiccantRegenKWhTh).toBe(0);
  });

  it('with default desiccant assumptions the value gate keeps adaptive off the desiccant', () => {
    const a = simulateYear(SURPLUS, 'adaptive');
    const p = simulateYear(SURPLUS, 'dhw-priority');
    expect(a.totals.desiccantRegenKWhTh).toBe(0);
    expect(a.totals.dhwSolarKWhTh).toBeCloseTo(p.totals.dhwSolarKWhTh, 6);
  });

  it('under optimistic desiccant assumptions adaptive uses surplus heat and the net HVAC result is reported', () => {
    const a = simulateYear(SURPLUS_OPT, 'adaptive');
    const p = simulateYear(SURPLUS_OPT, 'dhw-priority');
    const f = simulateYear(SURPLUS_OPT, 'fixed-schedule');
    expect(a.totals.desiccantRegenKWhTh).toBeGreaterThan(0);
    expect(a.totals.moistureRemovedKg).toBeGreaterThan(0);
    // hot water is served first: adaptive does not lose DHW heat against dhw-priority
    expect(a.totals.dhwSolarKWhTh).toBeGreaterThanOrEqual(p.totals.dhwSolarKWhTh * 0.99);
    // the naive schedule gives up DHW heat
    expect(f.totals.dhwSolarKWhTh).toBeLessThan(p.totals.dhwSolarKWhTh);
    expect(Number.isFinite(a.totals.hvacSavedKWhE)).toBe(true);
    expect(a.totals.unmetKWhTh).toBe(0);
  });

  it('adaptive desiccant heat only flows when the real outlet is near the minimum regeneration temperature', () => {
    const r = run(SURPLUS_OPT, 'terik', 'adaptive');
    for (const s of r.steps) {
      if (s.router.allocW.desiccant > 0) {
        expect(s.collector.outletC).toBeGreaterThanOrEqual(SURPLUS_OPT.controller.desiccantMinRegenC - 2 - 1e-9);
      }
    }
  });
});

describe('PV derate and specific yield', () => {
  it('plain-PV specific yield lands in 1350-1650 kWh/kWp (kWp = area x 0,2)', () => {
    const b = baselineInputs(SYS);
    const y = b.conventionalPvKWhEPerYear / (b.areaM2 * 0.2);
    expect(y).toBeGreaterThan(1350);
    expect(y).toBeLessThan(1650);
  });

  it('the derate scales PV/T electricity and plain PV alike, thermal results unchanged', () => {
    const one: SystemInputs = { ...SYS, array: { ...SYS.array, systemDerate: 1 } };
    const a = simulateYear(SYS, 'dhw-priority');
    const b = simulateYear(one, 'dhw-priority');
    expect(a.totals.pvKWhE / b.totals.pvKWhE).toBeCloseTo(SYS.array.systemDerate, 6);
    const ratio = baselineInputs(SYS).conventionalPvKWhEPerYear / baselineInputs(one).conventionalPvKWhEPerYear;
    expect(ratio).toBeCloseTo(SYS.array.systemDerate, 6);
    expect(a.totals.dhwSolarKWhTh).toBeCloseTo(b.totals.dhwSolarKWhTh, 6);
  });

  it('PV/T and plain-PV electricity are of the same order', () => {
    const b = baselineInputs(SYS);
    const ratio = b.solarvein.totals.pvKWhE / b.conventionalPvKWhEPerYear;
    expect(ratio).toBeGreaterThan(0.9);
    expect(ratio).toBeLessThan(1.1);
  });
});

describe('tank state of charge and pump switching', () => {
  it('SoC is normalised between mains and the DHW setpoint', () => {
    const r = run(SYS, 'terik');
    for (const s of r.steps) {
      const span = SYS.hotel.dhwSetpointC - SYS.hotel.mainsC;
      const exp = Math.min(Math.max(((s.tank.topC + s.tank.bottomC) / 2 - SYS.hotel.mainsC) / span, 0), 1);
      expect(s.tank.soc).toBeCloseTo(exp, 9);
    }
    expect(Math.max(...r.steps.map((s) => s.tank.soc))).toBeGreaterThan(0.3);
  });

  for (const sc of SCENARIOS) {
    it(`pump switching invariants (${sc})`, () => {
      const r = run(SYS, sc);
      const days = sc === 'hujan-3-hari' ? 3 : 1;
      let starts = 0;
      let prev = false;
      let runH = 0;
      for (const s of r.steps) {
        if (s.router.pumpOn) {
          runH += r.dtH;
          if (!prev) starts++;
        }
        prev = s.router.pumpOn;
      }
      expect(starts).toBeLessThanOrEqual(6 * days);
      expect(runH).toBeLessThanOrEqual(12 * days + 1e-9);
      if (sc === 'terik') expect(starts).toBeGreaterThan(0);
    });
  }
});

describe('72 h ledger sanity', () => {
  it('net CO2e of 3 rainy days is at least minus (standby + parasitic + 3 days of embodied)', () => {
    const r = run(SYS, 'hujan-3-hari');
    const c = SYS.carbon;
    const areaM2 = SYS.array.modules * SYS.array.module.areaM2;
    const life = 20;
    const embodied3d = ((c.embodiedPvtKgPerM2 * areaM2 + c.embodiedBosKg) / life) * (3 / 365);
    const parasitic = r.totals.parasiticKWhE * c.gridKgPerKWhE;
    const avoided =
      r.totals.pvKWhE * c.gridKgPerKWhE + (r.totals.dhwSolarKWhTh / SYS.hotel.heaterEfficiency) * c.lpgKgPerKWhFuel;
    const standby = 0; // tank standby is already inside the solar-DHW and backup energies (not counted twice)
    const net = avoided - parasitic - embodied3d;
    expect(avoided).toBeGreaterThanOrEqual(0);
    expect(net).toBeGreaterThanOrEqual(-(standby + parasitic + embodied3d) - 1e-9);
    expect(r.totals.unmetKWhTh).toBe(0);
  });
});

describe('heat-pump source option', () => {
  const hp: SystemInputs = { ...SYS, heatPumpSource: { enabled: true, carnotFraction: 0.45 } };

  it('is off by default (no heatPump field, no work total)', () => {
    const r = run(SYS, 'terik');
    expect(r.steps.every((s) => s.heatPump === undefined)).toBe(true);
    expect(r.totals.heatPumpWorkKWhE).toBeUndefined();
  });

  it('COP is at most Carnot x fraction, work is non-negative, service is unchanged', () => {
    const r = run(hp, 'hujan-3-hari');
    let used = 0;
    const carnot = carnotCopHeating(15 - EVAP_APPROACH_K, hp.hotel.dhwSetpointC + COND_APPROACH_K);
    for (const s of r.steps) {
      expect(s.heatPump).toBeDefined();
      const h = s.heatPump!;
      expect(h.workWe).toBeGreaterThanOrEqual(0);
      if (h.on) {
        used++;
        expect(h.cop).toBeLessThanOrEqual(0.45 * carnot + 1e-9);
        expect(h.cop).toBeGreaterThan(1);
        expect(h.sourceW).toBeGreaterThan(0);
        expect(s.router.pumpOn).toBe(false);
      }
      expect(s.dhw.unmetW).toBe(0);
      expect(s.dhw.backupW).toBeGreaterThanOrEqual(0);
    }
    expect(used).toBeGreaterThan(0);
    expect(r.totals.heatPumpWorkKWhE!).toBeGreaterThan(0);
    const base = run(SYS, 'hujan-3-hari');
    expect(r.totals.dhwSolarKWhTh).toBeGreaterThan(base.totals.dhwSolarKWhTh);
    expect(r.totals.unmetKWhTh).toBe(0);
    expect(r.totals.dhwSolarKWhTh + r.totals.dhwBackupKWhTh).toBeCloseTo(r.totals.dhwDemandKWhTh, 6);
  });
});

describe('simulateYear, baselineInputs, areaSweep', () => {
  it('weights sum to 365 days and totals are the weighted day totals', () => {
    expect(ANNUAL_DAY_WEIGHTS.reduce((a, w) => a + w.days, 0)).toBe(365);
    const y = simulateYear(SYS, 'adaptive');
    expect(y.weights).toEqual(ANNUAL_DAY_WEIGHTS);
    expect(y.strategy).toBe('adaptive');
    const demandDay = simulateSystem(SYS, 'terik').totals.dhwDemandKWhTh;
    expect(y.totals.dhwDemandKWhTh).toBeCloseTo(demandDay * 365, 3);
    expect(y.totals.unmetKWhTh).toBe(0);
    expect(y.totals.solarFraction).toBeGreaterThan(0.1);
    expect(y.totals.solarFraction).toBeLessThan(0.9);
    expect(Math.abs(y.totals.tankDeltaKWhTh)).toBeLessThan(0.02 * y.totals.dhwSolarKWhTh);
  });

  it('baselineInputs feeds compareBaselines', () => {
    const b = baselineInputs(SYS);
    expect(b.areaM2).toBeCloseTo(SYS.array.modules * SYS.array.module.areaM2, 9);
    expect(b.conventionalPvKWhEPerYear).toBeGreaterThan(0);
    expect(b.pvtDhwOnly.strategy).toBe('dhw-priority');
    expect(b.pvtDhwOnly.totals.desiccantRegenKWhTh).toBe(0);
    const ratio = b.solarvein.totals.pvKWhE / b.conventionalPvKWhEPerYear;
    expect(ratio).toBeGreaterThan(0.7);
    expect(ratio).toBeLessThan(1.3);
    expect(b.dhwDemandKWhThPerYear).toBeCloseTo(b.solarvein.totals.dhwDemandKWhTh, 9);
    const c = compareBaselines(SYS, b);
    for (const id of ['B1', 'B2', 'B3', 'B4'] as const) expect(Number.isFinite(c.ledgers[id].netKgPerYear)).toBe(true);
  });

  it('area sweep: more area gives more solar heat and carbon, with diminishing heat per m2', () => {
    const A = SYS.array.modules * SYS.array.module.areaM2;
    const pts = areaSweep(SYS, [A / 2, A, 2 * A], ['dhw-priority', 'adaptive']);
    expect(pts.length).toBe(6);
    const of = (a: number, s: RouterStrategy) => pts.find((p) => p.areaM2 === a && p.strategy === s)!;
    for (const s of ['dhw-priority', 'adaptive'] as const) {
      expect(of(A, s).dhwSolarKWhThPerYear).toBeGreaterThan(of(A / 2, s).dhwSolarKWhThPerYear);
      expect(of(2 * A, s).dhwSolarKWhThPerYear).toBeGreaterThan(of(A, s).dhwSolarKWhThPerYear);
      expect(of(2 * A, s).bypassKWhThPerYear).toBeGreaterThanOrEqual(0);
      expect(of(2 * A, s).netKgPerYear).toBeGreaterThan(of(A / 2, s).netKgPerYear);
    }
    const perM2 = (a: number) => of(a, 'adaptive').dhwSolarKWhThPerYear / a;
    expect(perM2(2 * A)).toBeLessThan(perM2(A / 2));
  });
});

describe('performance and documentation', () => {
  it('24 h run and annual run are fast (generous bounds, warm JIT)', () => {
    simulateSystem(SYS, 'terik');
    const t0 = performance.now();
    simulateSystem(SYS, 'terik');
    const day = performance.now() - t0;
    const t1 = performance.now();
    simulateYear(SYS, 'adaptive');
    const year = performance.now() - t1;
    expect(day).toBeLessThan(100);
    expect(year).toBeLessThan(500);
  });

  it('assumption ids are unique', () => {
    expect(new Set(DAY_ASSUMPTIONS.map((a) => a.id)).size).toBe(DAY_ASSUMPTIONS.length);
  });
});
