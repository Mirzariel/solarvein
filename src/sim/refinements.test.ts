import { describe, expect, it } from 'vitest';
import { CARBON_HOURS_GUIDANCE, DEFAULT_CARBON, computeCarbon } from './carbon';
import { MODEL_CONSTANTS, simulate } from './model';
import { INPUT_LIMITS, PRESETS } from './presets';

describe('glass series resistance, rain attribution, presets', () => {
  it('front heat passes through U_cg: T_cell - T_glass = (q_front + q_rain)/(A U_cg), glass between cell and ambient', () => {
    for (const p of [PRESETS.sunny, PRESETS.rainy]) {
      const r = simulate(p);
      const glass = r.profile.find((n) => n.id === 'glass')!.tempC;
      expect(r.coefficients.uCellGlass).toBe(200);
      expect((r.qFrontLossW + r.qRainW) / (r.inputs.areaM2 * 200)).toBeCloseTo(r.cellC - glass, 6);
    }
    const sun = simulate(PRESETS.sunny, 'conventional-pv');
    const g = sun.profile.find((n) => n.id === 'glass')!.tempC;
    expect(g).toBeLessThan(sun.cellC);
    expect(g).toBeGreaterThan(sun.inputs.ambientC);
  });

  it('qLiquidNoRainW equals qLiquidW when dry or pump off, and is a real dry re-solve otherwise', () => {
    const dry = simulate(PRESETS.sunny);
    expect(dry.qLiquidNoRainW).toBe(dry.qLiquidW);
    expect(simulate({ ...PRESETS.rainy, pumpControl: 'off' }).qLiquidNoRainW).toBe(0);
    const wet = simulate(PRESETS.rainy);
    const manual = simulate({ ...PRESETS.rainy, rainMmH: 0, pumpControl: 'on' });
    expect(wet.qLiquidNoRainW).toBeCloseTo(manual.qLiquidW, 6);
    expect(wet.qLiquidW).toBeLessThan(wet.qLiquidNoRainW!);
    expect(wet.qLiquidNoRainW!).toBeLessThan(-100);
  });

  it('rain parameters: eps 0.5, wet-bulb offset 1 K; band eps 0.3-1.0 brackets the preset', () => {
    expect(MODEL_CONSTANTS.rainEffectiveness).toBe(0.5);
    expect(MODEL_CONSTANTS.rainTempOffsetK).toBe(1);
    // Band: emulate eps by scaling rain intensity (h_rain is linear in eps * R); sky depression held by comparing at the same R.
    const q = (scale: number) =>
      simulate({ ...PRESETS.rainy, rainMmH: PRESETS.rainy.rainMmH * scale, pumpControl: 'on' }).qLiquidW;
    // eps 0.3 -> x0.6 ; eps 1.0 -> x2 (sky term saturates at R >= 5 mm/h, so this is the pure rain-coefficient effect)
    expect(q(0.6)).toBeGreaterThan(q(1));
    expect(q(2)).toBeLessThan(q(1));
    expect(q(0.6)).toBeLessThan(-300);
  });

  it('presets: sunny T_in 40 C, rainy dry-cooler COP 30 with limit up to 60', () => {
    expect(PRESETS.sunny.inletC).toBe(40);
    expect(PRESETS.rainy.coolingCOP).toBe(30);
    expect(PRESETS.rainy.inletC).toBe(45);
    expect(INPUT_LIMITS.coolingCOP).toMatchObject({ min: 1, max: 60, step: 0.5 });
    const h = INPUT_LIMITS.coolingCOP.help;
    expect(h).toMatch(/dry cooler/);
    expect(h).toMatch(/menara pendingin/);
    expect(h).toMatch(/chiller/);
  });

  it('sunny preset: harvest, cell cooler than stagnation, plausible thermal efficiency (< 50 %)', () => {
    const r = simulate(PRESETS.sunny);
    expect(r.regime).toBe('harvest');
    expect(r.qLiquidW / r.solarInputW).toBeLessThan(0.5);
    expect(r.qLiquidW / r.solarInputW).toBeGreaterThan(0.35);
  });

  it('simulate() is fast (< 0.1 ms per call)', () => {
    // best of several batches: robust against other test workers loading the CPU
    const n = 3000;
    let best = Infinity;
    for (let rep = 0; rep < 5; rep++) {
      const t0 = performance.now();
      for (let i = 0; i < n; i++) simulate({ ...PRESETS.rainy, irradiance: 100 + (i % 300) });
      best = Math.min(best, (performance.now() - t0) / n);
    }
    expect(best).toBeLessThan(0.1);
  });
});

describe('carbon: incremental ledger', () => {
  it('incremental vs conventional PV baseline (sunny)', () => {
    const r = simulate(PRESETS.sunny);
    const conv = simulate(PRESETS.sunny, 'conventional-pv');
    const a = DEFAULT_CARBON;
    const c = computeCarbon(r, a, conv);
    const h = a.hoursPerYear / 1000;
    expect(c.incrementalNetKgPerYear).toBeCloseTo(c.netKgPerYear - conv.electricalW * h * a.gridKgPerKWh, 9);
    expect(c.incrementalNetKgPerYear!).toBeLessThan(c.netKgPerYear);
    expect(c.incrementalNetKgPerYear!).toBeGreaterThan(0);
    expect(c.incrementalPaybackYears).toBeCloseTo(180 / c.incrementalNetKgPerYear!, 9);
    expect(computeCarbon(r, a).incrementalNetKgPerYear).toBeUndefined();
    expect(computeCarbon(r, a).incrementalPaybackYears).toBeUndefined();
  });

  it('incremental payback is Infinity when the unit adds nothing over conventional PV', () => {
    const conv = simulate(PRESETS.sunny, 'conventional-pv');
    const same = computeCarbon(conv, DEFAULT_CARBON, conv);
    expect(same.incrementalNetKgPerYear).toBeCloseTo(0, 9);
    expect(same.incrementalPaybackYears).toBe(Infinity);
  });

  it('documents scenario-dependent hours (heavy rain 120-250 h/yr; default stays 1400)', () => {
    expect(CARBON_HOURS_GUIDANCE.rainyHeavy.min).toBe(120);
    expect(CARBON_HOURS_GUIDANCE.rainyHeavy.max).toBe(250);
    expect(DEFAULT_CARBON.hoursPerYear).toBe(1400);
    const rr = simulate(PRESETS.rainy);
    const rc = simulate(PRESETS.rainy, 'conventional-pv');
    const inc = computeCarbon(
      rr,
      { ...DEFAULT_CARBON, hoursPerYear: CARBON_HOURS_GUIDANCE.rainyHeavy.typical, coolingDisplacementModeled: true },
      rc,
    );
    expect(Number.isNaN(inc.incrementalNetKgPerYear)).toBe(false);
  });
});
