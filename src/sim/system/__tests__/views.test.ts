import { describe, expect, it } from 'vitest';
import type { DayResult, DayStep, Sink, SystemInputs } from '../contract';
import { DEFAULT_SYSTEM } from '../hotel';
import { simulateSystem } from '../day';
import { DESICCANT_NOT_BENEFICIAL, DESICCANT_STATUS, LABELS, SIM_BADGE } from '../labels';
import {
  MODE_TARGETS,
  createSystemView,
  cumulative,
  desiccantInputFor,
  finiteOrNull,
  fullKey,
  getSystemView,
  modeBands,
  pumpStarts,
  pvGainWePerWth,
  routerSnapshot,
  simKey,
  stackedAlloc,
  stepAt,
} from '../views';

const SINKS: Sink[] = ['dhw', 'tank', 'desiccant', 'bypass'];
const sum = (r: Record<Sink, number>) => SINKS.reduce((s, k) => s + r[k], 0);

const DAY: DayResult = simulateSystem(DEFAULT_SYSTEM, 'terik');
const RAIN3: DayResult = simulateSystem(DEFAULT_SYSTEM, 'hujan-3-hari');
const withCarbon = (sys: SystemInputs, c: Partial<SystemInputs['carbon']>): SystemInputs => ({
  ...sys,
  carbon: { ...sys.carbon, ...c },
});

describe('stepAt', () => {
  it('returns the recorded step at an exact step time', () => {
    for (const i of [0, 10, 52, 95]) {
      const s = DAY.steps[i] as DayStep;
      const r = stepAt(DAY, s.t);
      expect(r.t).toBeCloseTo(s.t, 9);
      expect(r.router.mode).toBe(s.router.mode);
      expect(r.router.pumpOn).toBe(s.router.pumpOn);
      expect(r.router.reason).toBe(s.router.reason);
      expect(r.collector.electricalW).toBeCloseTo(s.collector.electricalW, 6);
      expect(r.tank.topC).toBeCloseTo(s.tank.topC, 9);
      expect(r.climate.irradiance).toBeCloseTo(s.climate.irradiance, 9);
      for (const k of SINKS) expect(r.router.valves[k]).toBeCloseTo(s.router.valves[k], 9);
    }
  });

  it('interpolates numeric fields linearly at midpoints', () => {
    const i = 52;
    const a = DAY.steps[i] as DayStep;
    const b = DAY.steps[i + 1] as DayStep;
    const r = stepAt(DAY, (a.t + b.t) / 2);
    expect(r.climate.irradiance).toBeCloseTo((a.climate.irradiance + b.climate.irradiance) / 2, 6);
    expect(r.tank.topC).toBeCloseTo((a.tank.topC + b.tank.topC) / 2, 9);
    expect(r.collector.electricalW).toBeCloseTo((a.collector.electricalW + b.collector.electricalW) / 2, 6);
    expect(r.dhw.backupW).toBeCloseTo((a.dhw.backupW + b.dhw.backupW) / 2, 6);
    expect(r.hourOfDay).toBeCloseTo((a.t + b.t) / 2, 9);
  });

  it('takes discrete fields from the nearest step', () => {
    for (let i = 0; i < DAY.steps.length - 1; i++) {
      const a = DAY.steps[i] as DayStep;
      const b = DAY.steps[i + 1] as DayStep;
      if (a.router.mode === b.router.mode && a.router.pumpOn === b.router.pumpOn) continue;
      const nearA = stepAt(DAY, a.t + 0.1 * (b.t - a.t));
      const nearB = stepAt(DAY, a.t + 0.9 * (b.t - a.t));
      expect(nearA.router.mode).toBe(a.router.mode);
      expect(nearA.router.pumpOn).toBe(a.router.pumpOn);
      expect(nearA.router.reason).toBe(a.router.reason);
      expect(nearB.router.mode).toBe(b.router.mode);
      expect(nearB.router.pumpOn).toBe(b.router.pumpOn);
      expect(nearB.router.reason).toBe(b.router.reason);
    }
  });

  it('renormalises valves to sum 1 when the pump is on, and zeroes router flows when off, at every sub-step', () => {
    let sawOn = false;
    let sawOff = false;
    for (let t = 0; t <= 24; t += 0.0625) {
      const r = stepAt(DAY, t);
      if (r.router.pumpOn) {
        sawOn = true;
        expect(sum(r.router.valves)).toBeCloseTo(1, 9);
        for (const k of SINKS) {
          expect(r.router.valves[k]).toBeGreaterThanOrEqual(-1e-12);
          expect(r.router.allocW[k]).toBeGreaterThanOrEqual(-1e-9);
        }
      } else {
        sawOff = true;
        expect(sum(r.router.valves)).toBe(0);
        expect(sum(r.router.allocW)).toBe(0);
      }
    }
    expect(sawOn && sawOff).toBe(true);
  });

  it('clamps t to the recorded range and keeps hourOfDay in [0, 24) over 72 h', () => {
    const first = DAY.steps[0] as DayStep;
    const last = DAY.steps[DAY.steps.length - 1] as DayStep;
    expect(stepAt(DAY, -5).t).toBeCloseTo(first.t, 9);
    expect(stepAt(DAY, 99).t).toBeCloseTo(last.t, 9);
    expect(stepAt(DAY, Number.NaN).t).toBeCloseTo(first.t, 9);
    const r = stepAt(RAIN3, 50.3);
    expect(r.hourOfDay).toBeCloseTo(2.3, 9);
    expect(r.t).toBeCloseTo(50.3, 9);
  });

  it('does not mutate the day result', () => {
    const before = JSON.stringify(DAY.steps[40]);
    stepAt(DAY, 10.01);
    expect(JSON.stringify(DAY.steps[40])).toBe(before);
  });
});

describe('routerSnapshot, modeBands, pumpStarts, stackedAlloc, cumulative', () => {
  it('routerSnapshot mirrors the step and copies the records', () => {
    const s = DAY.steps[52] as DayStep;
    const snap = routerSnapshot(s);
    expect(snap.mode).toBe(s.router.mode);
    expect(snap.tankSoc).toBe(s.tank.soc);
    expect(snap.tankTopC).toBe(s.tank.topC);
    expect(snap.valves).toEqual(s.router.valves);
    expect(snap.valves).not.toBe(s.router.valves);
    expect(snap.reason).toBe(s.router.reason);
  });

  for (const [name, day, hours] of [
    ['24 h', DAY, 24],
    ['72 h', RAIN3, 72],
  ] as const) {
    it(`modeBands tile the whole ${name} range without gaps and merge equal neighbours`, () => {
      const bands = modeBands(day);
      expect(bands.length).toBeGreaterThan(0);
      expect(bands[0]?.t0).toBeCloseTo(0, 9);
      expect(bands[bands.length - 1]?.t1).toBeCloseTo(hours, 9);
      for (let i = 0; i < bands.length; i++) {
        const b = bands[i];
        expect(b!.t1).toBeGreaterThan(b!.t0);
        if (i > 0) {
          expect(b!.t0).toBeCloseTo(bands[i - 1]!.t1, 9);
          expect(b!.mode).not.toBe(bands[i - 1]!.mode);
        }
      }
      // every step's mode equals the band covering its time
      for (const s of day.steps) {
        const band = bands.find((b) => s.t >= b.t0 && s.t < b.t1);
        expect(band?.mode).toBe(s.router.mode);
      }
    });
  }

  it('a clear day has night mode C and a daytime mode A band', () => {
    const modes = modeBands(DAY).map((b) => b.mode);
    expect(modes).toContain('A');
    expect(modes).toContain('C');
    expect(modeBands({ ...DAY, steps: [] })).toEqual([]);
  });

  it('pumpStarts counts off->on edges', () => {
    let n = 0;
    for (let i = 1; i < DAY.steps.length; i++) {
      if ((DAY.steps[i] as DayStep).router.pumpOn && !(DAY.steps[i - 1] as DayStep).router.pumpOn) n++;
    }
    expect(pumpStarts(DAY)).toBe(n);
    expect(n).toBeGreaterThanOrEqual(1);
  });

  it('stackedAlloc has one row per step with non-negative finite values', () => {
    const rows = stackedAlloc(DAY);
    expect(rows.length).toBe(DAY.steps.length);
    for (const r of rows) {
      for (const v of [r.dhw, r.desiccant, r.tank, r.bypass, r.fromTank, r.backup]) {
        expect(Number.isFinite(v)).toBe(true);
        expect(v).toBeGreaterThanOrEqual(0);
      }
    }
  });

  it('cumulative is monotone and ends at the day totals', () => {
    const c = cumulative(DAY);
    expect(c.length).toBe(DAY.steps.length);
    for (let i = 1; i < c.length; i++) {
      expect(c[i]!.solarDhwKWhTh).toBeGreaterThanOrEqual(c[i - 1]!.solarDhwKWhTh);
      expect(c[i]!.backupKWhTh).toBeGreaterThanOrEqual(c[i - 1]!.backupKWhTh);
      expect(c[i]!.pvKWhE).toBeGreaterThanOrEqual(c[i - 1]!.pvKWhE);
    }
    const end = c[c.length - 1]!;
    expect(end.t).toBeCloseTo(24, 9);
    expect(end.solarDhwKWhTh).toBeCloseTo(Number(DAY.totals.dhwSolarKWhTh), 6);
    expect(end.backupKWhTh).toBeCloseTo(Number(DAY.totals.dhwBackupKWhTh), 6);
    expect(end.pvKWhE).toBeCloseTo(Number(DAY.totals.pvKWhE), 6);
  });
});

describe('LABELS', () => {
  const count = (o: object) => Object.keys(o).length;
  it('covers every union member (compile-time via Record types, runtime key counts)', () => {
    expect(count(LABELS.mode)).toBe(3);
    expect(count(LABELS.modeTarget)).toBe(3);
    expect(count(LABELS.sink)).toBe(4);
    expect(count(LABELS.reason)).toBe(9);
    expect(count(LABELS.verdict)).toBe(3);
    expect(count(LABELS.evidence)).toBe(6);
    expect(count(LABELS.scenario)).toBe(4);
    expect(count(LABELS.strategy)).toBe(3);
    expect(count(LABELS.baseline)).toBe(4);
  });

  it('every label is a non-empty string, and mode labels are at most 5 words', () => {
    for (const map of Object.values(LABELS)) {
      for (const v of Object.values(map as Record<string, string>)) {
        expect(typeof v).toBe('string');
        expect(v.trim().length).toBeGreaterThan(0);
      }
    }
    for (const v of Object.values(LABELS.mode)) expect(v.replace('·', '').split(/\s+/).filter(Boolean).length).toBeLessThanOrEqual(5);
  });

  it('uses the verbatim fixed strings', () => {
    expect(LABELS.verdict['tidak-layak']).toBe('Tidak layak');
    expect(LABELS.sink.bypass).toBe('Tidak dipakai (bypass)');
    expect(DESICCANT_STATUS).toBe('Hipotesis riset · belum divalidasi');
    expect(SIM_BADGE).toBe('Simulasi · belum ada data ukur');
    expect(DESICCANT_NOT_BENEFICIAL).toBe('Desikan tidak menguntungkan pada kondisi ini.');
    expect(JSON.stringify(LABELS)).not.toMatch(/kami/i);
  });
});

describe('MODE_TARGETS', () => {
  it('has valid scenarios and hours', () => {
    expect(Object.keys(MODE_TARGETS).sort()).toEqual(['A', 'B', 'C']);
    for (const t of Object.values(MODE_TARGETS)) {
      expect(['terik', 'berawan', 'hujan', 'hujan-3-hari']).toContain(t.scenario);
      expect(t.hour).toBeGreaterThanOrEqual(0);
      expect(t.hour).toBeLessThan(24);
    }
    expect(MODE_TARGETS.A).toEqual({ scenario: 'terik', hour: 13 });
    expect(MODE_TARGETS.B).toEqual({ scenario: 'hujan', hour: 15 });
    expect(MODE_TARGETS.C).toEqual({ scenario: 'terik', hour: 22 });
  });

  it('the computed mode at the A and C targets matches the intended condition', () => {
    const a = stepAt(DAY, MODE_TARGETS.A.hour);
    const c = stepAt(DAY, MODE_TARGETS.C.hour);
    expect(a.router.mode).toBe('A');
    expect(c.router.mode).toBe('C');
  });
});

describe('finiteOrNull', () => {
  it('passes finite numbers and nulls the rest', () => {
    expect(finiteOrNull(0)).toBe(0);
    expect(finiteOrNull(-3.5)).toBe(-3.5);
    expect(finiteOrNull(Number.NaN)).toBeNull();
    expect(finiteOrNull(Infinity)).toBeNull();
    expect(finiteOrNull(-Infinity)).toBeNull();
    expect(finiteOrNull(null)).toBeNull();
    expect(finiteOrNull(undefined)).toBeNull();
  });
});

describe('keys', () => {
  it('simKey is unchanged by tariff / emission-factor / price / embodied edits, fullKey is not', () => {
    const base = DEFAULT_SYSTEM;
    const edited: SystemInputs = {
      ...withCarbon(base, { gridKgPerKWhE: 0.5, embodiedBosKg: 1234, lpgKgPerKWhFuel: 0.3 }),
      economics: { ...base.economics, gridTariffIdrPerKWh: 9999, lpgPriceIdrPerKg: 1 },
    };
    expect(simKey(edited)).toBe(simKey(base));
    expect(fullKey(edited)).not.toBe(fullKey(base));
  });

  it('simKey changes with every sim-relevant slice', () => {
    const base = DEFAULT_SYSTEM;
    const variants: SystemInputs[] = [
      { ...base, hotel: { ...base.hotel, rooms: base.hotel.rooms + 1 } },
      { ...base, array: { ...base.array, modules: base.array.modules + 1 } },
      { ...base, tank: { ...base.tank, volumeL: base.tank.volumeL + 100 } },
      { ...base, desiccant: { ...base.desiccant, bedMassKg: base.desiccant.bedMassKg + 1 } },
      { ...base, controller: { ...base.controller, onK: base.controller.onK + 1 } },
      { ...base, heatPumpSource: { ...base.heatPumpSource, enabled: !base.heatPumpSource.enabled } },
      withCarbon(base, { coilRefCop: base.carbon.coilRefCop + 0.1 }),
      withCarbon(base, { aftercoolerCop: base.carbon.aftercoolerCop + 0.1 }),
    ];
    for (const v of variants) expect(simKey(v)).not.toBe(simKey(base));
  });

  it('keys are independent of property order', () => {
    const reordered = JSON.parse(JSON.stringify({ ...DEFAULT_SYSTEM, hotel: Object.fromEntries(Object.entries(DEFAULT_SYSTEM.hotel).reverse()) })) as SystemInputs;
    expect(simKey(reordered)).toBe(simKey(DEFAULT_SYSTEM));
    expect(fullKey(reordered)).toBe(fullKey(DEFAULT_SYSTEM));
  });
});

describe('desiccantInputFor and pvGainWePerWth', () => {
  it('builds the input from the climate at that time with zero PV penalty and pump', () => {
    const i = desiccantInputFor(DEFAULT_SYSTEM, 'terik', 13, 'exhaust');
    expect(i.regenAir).toBe('exhaust');
    expect(i.params.regenAir).toBe('exhaust');
    expect(i.process.tC).toBe(i.ambient.ambientC);
    expect(i.process.humidityRatio).toBe(i.ambient.humidityRatio);
    expect(i.pvPenaltyWe).toBe(0);
    expect(i.pumpWe).toBe(0);
    expect(i.hotel).toBe(DEFAULT_SYSTEM.hotel);
  });

  it('pvGainWePerWth is finite, positive and small (PV watts per thermal watt)', () => {
    const g = pvGainWePerWth(DEFAULT_SYSTEM);
    expect(Number.isFinite(g)).toBe(true);
    expect(g).toBeGreaterThan(0);
    expect(g).toBeLessThan(0.3);
  });
});

describe('createSystemView / getSystemView', () => {
  const sys: SystemInputs = { ...DEFAULT_SYSTEM, hotel: { ...DEFAULT_SYSTEM.hotel, rooms: 97 } }; // own cache key
  const v = createSystemView(sys);

  it('memoises per argument key (same object identity)', () => {
    expect(v.day('terik')).toBe(v.day('terik'));
    expect(v.day('terik')).toBe(v.day('terik', sys.controller.strategy));
    expect(v.day('terik', 'dhw-priority')).toBe(v.day('terik', 'dhw-priority'));
    expect(v.day('terik', 'dhw-priority')).not.toBe(v.day('terik', 'adaptive'));
    expect(v.year()).toBe(v.year());
    expect(v.baselineInputs()).toBe(v.baselineInputs());
    expect(v.baselines()).toBe(v.baselines());
    expect(v.heatUses()).toBe(v.heatUses());
    expect(v.desiccantSweep('ambient')).toBe(v.desiccantSweep('ambient'));
    expect(v.desiccantSweep('ambient')).not.toBe(v.desiccantSweep('exhaust'));
    expect(v.areaSweep([30, 60], ['adaptive'])).toBe(v.areaSweep([30, 60], ['adaptive']));
    expect(v.assumptions()).toBe(v.assumptions());
    expect(v.references()).toBe(v.references());
  });

  it('day matches a direct simulateSystem call', () => {
    const direct = simulateSystem(sys, 'berawan');
    expect(v.day('berawan').totals.dhwSolarKWhTh).toBeCloseTo(Number(direct.totals.dhwSolarKWhTh), 9);
  });

  it('desiccantSweep covers the default temperatures', () => {
    const sw = v.desiccantSweep('ambient');
    expect(sw.map((e) => e.regenC)).toEqual([35, 40, 45, 50, 55, 60, 65, 70]);
    expect(v.desiccantSweep('ambient', [50, 60]).length).toBe(2);
  });

  it('heatUses returns the five uses with finite values', () => {
    const h = v.heatUses();
    expect(h.map((x) => x.use).sort()).toEqual(['desiccant', 'dhw-electric', 'dhw-heat-pump', 'dhw-lpg', 'pv-lebih-dingin']);
    for (const x of h) expect(Number.isFinite(x.kgPerKWhTh)).toBe(true);
  });

  it('assumptions carry a module field; references list is non-empty', () => {
    const a = v.assumptions();
    expect(a.length).toBeGreaterThan(10);
    expect(new Set(a.map((x) => x.module))).toEqual(
      new Set(['hotel', 'dhw', 'tank', 'router', 'day', 'heatpump', 'desiccant', 'carbon', 'economics']),
    );
    for (const x of a) expect(x.module.length).toBeGreaterThan(0);
    expect(v.references().length).toBeGreaterThan(5);
  });

  it('views of systems that differ only in grid EF / tariff share the day cache but not the ledgers', () => {
    const edited = withCarbon(sys, { gridKgPerKWhE: 0.4 });
    const w = createSystemView(edited);
    expect(w.day('terik')).toBe(v.day('terik'));
    expect(w.baselines()).not.toBe(v.baselines());
  });

  it('getSystemView returns the same view for equal content and evicts beyond 8', () => {
    const a = getSystemView(sys);
    expect(getSystemView(JSON.parse(JSON.stringify(sys)) as SystemInputs)).toBe(a);
    for (let i = 0; i < 9; i++) getSystemView(withCarbon(sys, { gridKgPerKWhE: 0.1 + i / 100 }));
    expect(getSystemView(sys)).not.toBe(a);
  });
});
