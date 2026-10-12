import { describe, expect, it } from 'vitest';
import { PRESETS, simulate } from '../sim';
import { IMPACT_LOAD_DEFAULT } from './store';
import { electricityVsConvKWh, impactLedger, netRejectionBenefitW } from './impact';
import { energyUnit, impactPerRoof, massUnit, presetPair, roofsFromLog, scaleImpact, type ImpactAssumptions } from './impact';

const A: ImpactAssumptions = {
  gridKgPerKWh: 0.8,
  fuelKgPerKWh: 0.23,
  hoursPerYear: 1400,
  incrementalEmbodiedKg: 180,
  coolingDisplacementModeled: false,
  loadFraction: 1,
};

describe('impact scaler', () => {
  it('feeds from simulate() on the preset (no hand-typed numbers)', () => {
    const p = impactPerRoof('sunny', A);
    const r = simulate(PRESETS.sunny, 'solarvein-dual');
    expect(p.dual.netElectricalW).toBeCloseTo(r.netElectricalW, 9);
    expect(p.kWhElectricNet).toBeCloseTo((r.netElectricalW * 1400) / 1000, 9);
    expect(p.kWhThermalUseful).toBeCloseTo((r.usefulHeatW * 1400) / 1000, 9);
  });

  it('heat is only rejected when a hot source exists', () => {
    expect(impactPerRoof('sunny', A).kWhThermalRejected).toBe(0);
    expect(impactPerRoof('rainy', { ...A, hoursPerYear: 180 }).kWhThermalRejected).toBeGreaterThan(0);
  });

  it('incremental carbon equals the ledger vs conventional PV and scales linearly with N', () => {
    const p = impactPerRoof('sunny', A);
    const { dual, conv } = presetPair('sunny');
    const h = 1.4;
    const expected = (dual.netElectricalW - conv.netElectricalW) * h * 0.8 + dual.avoidedFuelW * h * 0.23;
    expect(p.incrementalKg).toBeCloseTo(expected, 6);
    const t = scaleImpact(p, 1000, 4);
    expect(t.incrementalKg).toBeCloseTo(p.incrementalKg * 4000, 6);
    expect(t.kWhElectricNet).toBeCloseTo(p.kWhElectricNet * 4000, 6);
    expect(t.panels).toBe(4000);
  });

  it('rainy incremental stays honest: cooling credit only when the displaced device is modelled', () => {
    const off = impactPerRoof('rainy', { ...A, hoursPerYear: 180 });
    const on = impactPerRoof('rainy', { ...A, hoursPerYear: 180, coolingDisplacementModeled: true });
    expect(on.incrementalKg).toBeGreaterThan(off.incrementalKg);
    // Without a displaced cooler SolarVein cannot beat a plain PV module in the rainy snapshot.
    expect(off.incrementalKg).toBeLessThan(0);
  });

  it('default heat-use fraction is 50 % (never 100 %) and reproduces the reviewed defaults', () => {
    expect(IMPACT_LOAD_DEFAULT).toBe(0.5);
    const p = impactPerRoof('sunny', { ...A, loadFraction: IMPACT_LOAD_DEFAULT });
    const t = scaleImpact(p, 10_000, 4);
    expect(t.kWhThermalUseful / 1e6).toBeCloseTo(19.2, 1);
    expect(t.kWhElectricNet / 1e6).toBeCloseTo(14.9, 1);
    expect(t.incrementalKg / 1000).toBeGreaterThan(4800);
    expect(t.incrementalKg / 1000).toBeLessThan(5050);
    expect(p.incrementalPaybackYears).toBeCloseTo(1.5, 1);
  });

  it('hours without a heat load are not neutral: idle PVT makes less electricity than plain PV', () => {
    const p = impactPerRoof('sunny', { ...A, loadFraction: 0 });
    expect(p.kWhThermalUseful).toBe(0);
    expect(p.incrementalKg).toBeLessThan(0);
    expect(p.kWhElectricNet).toBeLessThan(p.kWhElectricConv);
  });

  it('roofsFromLog snaps to round numbers within 1..100000', () => {
    expect(roofsFromLog(0)).toBe(1);
    expect(roofsFromLog(5)).toBe(100_000);
    expect(roofsFromLog(4)).toBe(10_000);
    expect(roofsFromLog(2.5)).toBe(320);
    expect(roofsFromLog(9)).toBe(100_000);
  });

  it('unit helpers pick readable units', () => {
    expect(energyUnit(2_500_000).unit).toBe('GWh');
    expect(energyUnit(2_500).unit).toBe('MWh');
    expect(massUnit(-3_000).unit).toBe('ton');
    expect(massUnit(4_930_000).unit).toBe('ton');
  });

  it('ledger rows include the load fraction and sum to the total (default f = 50 %)', () => {
    const a = { ...A, loadFraction: IMPACT_LOAD_DEFAULT };
    const p = impactPerRoof('sunny', a);
    const L = impactLedger(p, a);
    expect(L.electricityDiffKg).toBeCloseTo(-4.9, 1); // not the f = 100 % value (+12,2)
    expect(L.electricityDiffKg + L.heatKg + L.coolingKg + L.pumpKg).toBeCloseTo(L.total, 6);
    expect(L.total).toBeCloseTo(123.4, 0);
  });

  it('electricity vs plain PV is signed and negative at the defaults (pump + idle hours)', () => {
    const p = impactPerRoof('sunny', { ...A, loadFraction: IMPACT_LOAD_DEFAULT });
    const perPanelKWh = electricityVsConvKWh(p);
    expect(perPanelKWh).toBeLessThan(0);
    expect((perPanelKWh * 40_000) / 1000).toBeCloseTo(-338, -1); // MWh for 10.000 roofs x 4 panels
  });

  it('rejection benefit subtracts the PV penalty (about +7,8 W, not +9,8 W)', () => {
    const { dual, conv } = presetPair('rainy');
    const net = netRejectionBenefitW(dual, conv);
    expect(net).toBeCloseTo(dual.avoidedCoolingElecW + dual.netElectricalW - conv.netElectricalW, 9);
    expect(net).toBeLessThan(dual.netCoolingBenefitW);
    expect(net).toBeCloseTo(7.8, 0);
  });
});
