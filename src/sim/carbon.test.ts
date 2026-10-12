import { describe, expect, it } from 'vitest';
import { DEFAULT_CARBON, computeCarbon } from './carbon';
import { simulate } from './model';
import { PRESETS } from './presets';

describe('computeCarbon', () => {
  it('defaults are sane and embodied is never zero', () => {
    expect(DEFAULT_CARBON.embodiedKg).toBeGreaterThan(0);
    expect(DEFAULT_CARBON.coolingDisplacementModeled).toBe(false);
    expect(DEFAULT_CARBON.gridKgPerKWh).toBeCloseTo(0.8, 1);
    expect(DEFAULT_CARBON.fuelKgPerKWh).toBeCloseTo(0.23, 2);
  });

  it('applies the documented formulas (sunny, harvest)', () => {
    const r = simulate(PRESETS.sunny);
    const a = DEFAULT_CARBON;
    const c = computeCarbon(r, a);
    expect(c.electricityKgPerYear).toBeCloseTo(((r.electricalW * a.hoursPerYear) / 1000) * a.gridKgPerKWh, 9);
    expect(c.heatKgPerYear).toBeCloseTo(((r.avoidedFuelW * a.hoursPerYear) / 1000) * a.fuelKgPerKWh, 9);
    expect(c.pumpKgPerYear).toBeCloseTo(((r.pumpW * a.hoursPerYear) / 1000) * a.gridKgPerKWh, 9);
    expect(c.netKgPerYear).toBeCloseTo(
      c.electricityKgPerYear + c.heatKgPerYear + c.coolingKgPerYear - c.pumpKgPerYear,
      9,
    );
    expect(c.carbonPaybackYears).toBeCloseTo(a.embodiedKg / c.netKgPerYear, 9);
    expect(Number.isFinite(c.carbonPaybackYears)).toBe(true);
  });

  it('cooling credit is zero unless coolingDisplacementModeled', () => {
    const r = simulate(PRESETS.rainy);
    expect(r.avoidedCoolingElecW).toBeGreaterThan(0);
    const off = computeCarbon(r, { ...DEFAULT_CARBON, coolingDisplacementModeled: false });
    expect(off.coolingKgPerYear).toBe(0);
    const on = computeCarbon(r, { ...DEFAULT_CARBON, coolingDisplacementModeled: true });
    expect(on.coolingKgPerYear).toBeCloseTo(((r.avoidedCoolingElecW * 1400) / 1000) * 0.8, 9);
    expect(on.netKgPerYear).toBeGreaterThan(off.netKgPerYear);
  });

  it('payback is Infinity when net <= 0', () => {
    const r = simulate({ ...PRESETS.sunny, irradiance: 0 }, 'solarvein-dual');
    const c = computeCarbon({ ...r, pumpW: 50 }, DEFAULT_CARBON);
    expect(c.netKgPerYear).toBeLessThan(0);
    expect(c.carbonPaybackYears).toBe(Infinity);
    const zero = computeCarbon({ ...r, electricalW: 0, avoidedFuelW: 0, pumpW: 0 }, DEFAULT_CARBON);
    expect(zero.netKgPerYear).toBe(0);
    expect(zero.carbonPaybackYears).toBe(Infinity);
  });

  it('never returns NaN even for non-finite inputs', () => {
    const r = simulate(PRESETS.sunny);
    const c = computeCarbon({ ...r, electricalW: NaN, avoidedFuelW: Infinity }, { ...DEFAULT_CARBON, hoursPerYear: NaN });
    for (const v of [c.electricityKgPerYear, c.heatKgPerYear, c.coolingKgPerYear, c.pumpKgPerYear, c.netKgPerYear]) {
      expect(Number.isNaN(v)).toBe(false);
    }
  });
});
