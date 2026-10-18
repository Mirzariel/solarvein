import { describe, expect, it } from 'vitest';
import { simulate } from '../model';
import { DEFAULT_INPUTS } from '../presets';
import { dewPointC, humidityRatio, latentHeatKJkg, saturationPressureKPa } from '../system/psychro';
import type { SimInputs } from '../types';

const base = (o: Partial<SimInputs> = {}): SimInputs => ({ ...DEFAULT_INPUTS, ...o });
const glassC = (r: ReturnType<typeof simulate>) => r.profile.find((p) => p.id === 'glass')!.tempC;

describe('pvt-liquid pump control', () => {
  it('auto needs a heat load: no load -> pump off; with load and sun -> harvest', () => {
    const noLoad = simulate(base({ heatLoadAvailable: false }), 'pvt-liquid');
    expect(noLoad.pumpOn).toBe(false);
    expect(noLoad.qLiquidW).toBe(0);
    const withLoad = simulate(base({ heatLoadAvailable: true }), 'pvt-liquid');
    expect(withLoad.pumpOn).toBe(true);
    expect(withLoad.regime).toBe('harvest');
    expect(withLoad.qLiquidW).toBeGreaterThan(300);
  });

  it("'on' runs the pump regardless; 'off' never does", () => {
    expect(simulate(base({ pumpControl: 'on', heatLoadAvailable: false }), 'pvt-liquid').pumpOn).toBe(true);
    expect(simulate(base({ pumpControl: 'off' }), 'pvt-liquid').pumpOn).toBe(false);
  });

  it('closes the energy balance over a grid (any pump command, wet or dry)', () => {
    for (const irradiance of [0, 120, 900])
      for (const inletC of [10, 45, 80])
        for (const pumpControl of ['auto', 'on', 'off'] as const)
          for (const rainMmH of [0, 15]) {
            const r = simulate(base({ irradiance, inletC, pumpControl, rainMmH, heatLoadAvailable: true }), 'pvt-liquid');
            expect(Math.abs(r.energyBalanceResidualW)).toBeLessThan(0.5);
          }
  });
});

describe('heat-pump source mode (night / rain, pump forced on, cold loop)', () => {
  const night = (o: Partial<SimInputs> = {}) =>
    simulate(
      base({ irradiance: 0, ambientC: 26, inletC: 15, flowLpm: 2, pumpControl: 'on', heatLoadAvailable: false, ...o }),
      'pvt-liquid',
    );

  it('environment -> liquid at G = 0, balance closes, no electricity from PV', () => {
    const r = night({ windMs: 1, rainMmH: 0 });
    expect(r.qLiquidW).toBeGreaterThan(0);
    expect(Math.abs(r.energyBalanceResidualW)).toBeLessThan(0.01);
    expect(r.electricalW).toBe(0);
    expect(r.outletC).toBeGreaterThan(15);
  });

  it('gain per m2 is in the council band (50-150 W/m2) dry, and rain increases it plausibly', () => {
    for (const windMs of [1, 2]) {
      const dry = night({ windMs, rainMmH: 0 });
      const wet = night({ windMs, rainMmH: 10 });
      const a = dry.inputs.areaM2;
      expect(dry.qLiquidW / a).toBeGreaterThan(50);
      expect(dry.qLiquidW / a).toBeLessThan(150);
      // rain (drops ~ambient) adds roughly 20-100 W/m2 on top (plan, section "Continuity")
      const rainAdd = (wet.qLiquidW - dry.qLiquidW) / a;
      expect(rainAdd).toBeGreaterThan(20);
      expect(rainAdd).toBeLessThan(100);
      expect(wet.qLiquidW / a).toBeLessThan(200);
      expect(Math.abs(wet.energyBalanceResidualW)).toBeLessThan(0.01);
    }
  });

  it('more wind -> more gain', () => {
    expect(night({ windMs: 2 }).qLiquidW).toBeGreaterThan(night({ windMs: 1 }).qLiquidW);
  });
});

describe('no tank cooling through a cold-night collector', () => {
  const hotLoop = { irradiance: 0, ambientC: 26, inletC: 45, windMs: 1.5, heatLoadAvailable: true };
  it('auto: pump off, no harvest, idle', () => {
    const r = simulate(base({ ...hotLoop, pumpControl: 'auto' }), 'pvt-liquid');
    expect(r.pumpOn).toBe(false);
    expect(r.qLiquidW).toBe(0);
    expect(r.usefulHeatW).toBe(0);
    expect(r.regime).toBe('idle');
  });
  it("'on' forced: qLiquidW < 0 (the loss the controller must avoid)", () => {
    const r = simulate(base({ ...hotLoop, pumpControl: 'on' }), 'pvt-liquid');
    expect(r.qLiquidW).toBeLessThan(0);
    expect(r.regime).toBe('negligible');
    expect(r.advisories.some((a) => a.code === 'COLLECTOR_COOLS_LOOP')).toBe(true);
  });
});

describe('condensation upper bound (report-only)', () => {
  const cold = {
    irradiance: 0,
    ambientC: 26,
    inletC: 15,
    windMs: 1,
    flowLpm: 2,
    pumpControl: 'on' as const,
    heatLoadAvailable: false,
  };
  it('absent humidityRatio -> 0, and humidity never changes the energy balance', () => {
    const none = simulate(base(cold), 'pvt-liquid');
    const wet = simulate(base({ ...cold, humidityRatio: humidityRatio(26, 0.9) }), 'pvt-liquid');
    expect(none.qCondensationUpperW).toBe(0);
    expect(wet.qCondensationUpperW).toBeGreaterThan(0);
    expect(wet.qLiquidW).toBe(none.qLiquidW);
    expect(wet.cellC).toBe(none.cellC);
  });
  it('zero when the glass is at or above the dew point', () => {
    const w = humidityRatio(26, 0.3);
    const dry = simulate(base({ ...cold, humidityRatio: w }), 'pvt-liquid');
    expect(glassC(dry)).toBeGreaterThanOrEqual(dewPointC(w));
    expect(dry.qCondensationUpperW).toBe(0);
    const sunny = simulate(base({ humidityRatio: humidityRatio(30, 0.8) }), 'pvt-liquid');
    expect(sunny.qCondensationUpperW).toBe(0);
  });
  it('matches the Lewis-analogy formula recomputed independently', () => {
    const w = humidityRatio(26, 0.9);
    const r = simulate(base({ ...cold, humidityRatio: w }), 'pvt-liquid');
    const tg = glassC(r);
    expect(tg).toBeLessThan(dewPointC(w));
    const hm = r.coefficients.hConvFront / (1.18 * 1006 * Math.pow(0.87, 2 / 3));
    const ps = saturationPressureKPa(tg);
    const wSat = (0.621945 * ps) / (101.325 - ps);
    const q = hm * 1.18 * r.inputs.areaM2 * (w - wSat) * latentHeatKJkg(tg) * 1000;
    expect(r.qCondensationUpperW!).toBeCloseTo(q, 6);
  });
});

describe('thermal efficiency is never constant (pvt-liquid, G 800, 31 C, 1.5 m/s, 2 L/min)', () => {
  const inlets = [28, 35, 40, 45, 50, 55];
  const rows = inlets.map((inletC) => {
    const r = simulate(
      base({
        irradiance: 800,
        ambientC: 31,
        windMs: 1.5,
        rainMmH: 0,
        flowLpm: 2,
        inletC,
        pumpControl: 'on',
        heatLoadAvailable: true,
      }),
      'pvt-liquid',
    );
    return { inletC, etaTh: r.qLiquidW / (800 * r.inputs.areaM2), etaE: r.etaElectrical, cellC: r.cellC };
  });
  it('eta_th strictly decreases with inlet temperature, spanning a wide range', () => {
    for (let i = 1; i < rows.length; i++) expect(rows[i]!.etaTh).toBeLessThan(rows[i - 1]!.etaTh);
    expect(rows[0]!.etaTh - rows[rows.length - 1]!.etaTh).toBeGreaterThan(0.2);
    expect(rows[0]!.etaTh).toBeLessThan(0.8);
    expect(rows[rows.length - 1]!.etaTh).toBeGreaterThan(0);
  });
  it('eta_e decreases as the cell warms', () => {
    for (let i = 1; i < rows.length; i++) {
      expect(rows[i]!.cellC).toBeGreaterThan(rows[i - 1]!.cellC);
      expect(rows[i]!.etaE).toBeLessThan(rows[i - 1]!.etaE);
    }
  });
});
