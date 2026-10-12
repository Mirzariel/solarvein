/**
 * Physics review (Agent G) regression checks. See docs/audit/03-physics.md.
 *
 * - Plain `it(...)`: invariants that hold today and must keep holding.
 * - `it.fails(...)`: documented KNOWN GAPS. They assert the DESIRED behaviour, so they pass while the gap exists
 *   and turn red ("expected to fail") the moment the gap is fixed: at that point flip them to plain `it`.
 */
import { describe, expect, it } from 'vitest';
import { deriveTargets } from '../../viz3d/effects/targets';
import { MODEL_CONSTANTS as K, compareConfigurations, simulate } from '../model';
import { INPUT_LIMITS, PRESETS } from '../presets';
import type { SimInputs } from '../types';

const A = PRESETS.rainy.areaM2;

describe('flow direction vs heat direction (golden rule 2)', () => {
  it('liquid never reverses and sign(T_out - T_in) == sign(qLiquid) over a grid', () => {
    for (const g of [0, 120, 600, 1100])
      for (const tin of [10, 25, 45, 80])
        for (const rain of [0, 15, 60])
          for (const wind of [0, 3, 10])
            for (const pc of ['auto', 'on', 'off'] as const) {
              const i: SimInputs = { ...PRESETS.rainy, irradiance: g, inletC: tin, rainMmH: rain, windMs: wind, pumpControl: pc, heatLoadAvailable: true, hotSourceAvailable: true };
              const r = simulate(i);
              expect(r.massFlowKgS).toBeGreaterThanOrEqual(0);
              if (r.pumpOn) {
                expect(r.massFlowKgS).toBeGreaterThan(0);
                expect(Math.sign(Math.round(r.deltaFluidK * 1e6))).toBe(Math.sign(Math.round(r.qLiquidW * 1e6)));
              } else {
                expect(r.qLiquidW).toBe(0);
                expect(r.outletC).toBe(r.inletC);
              }
              expect(Math.abs(r.energyBalanceResidualW)).toBeLessThan(1e-6);
            }
  });
});

describe('rainy preset: what actually produces the rejection (review finding P0-2)', () => {
  const p = PRESETS.rainy;
  const wet = simulate(p);
  const dry = simulate({ ...p, rainMmH: 0 });
  const night = simulate({ ...p, rainMmH: 0, irradiance: 0 });

  it('rain term is a minority of the front rejection and wind + IR carry most of it', () => {
    // After lead-approved changes (series glass resistance, eps_rain 0.5, dT_wb 1 K): preset q is about -550 W.
    expect(wet.qLiquidW).toBeLessThan(-500);
    expect(wet.qLiquidW).toBeGreaterThan(-600);
    // The model now exposes the attribution itself: q with rain = 0, everything else equal.
    expect(wet.qLiquidNoRainW).toBeCloseTo(dry.qLiquidW, 6);
    // Rain share of the duty is the minority.
    expect((wet.qLiquidW - (wet.qLiquidNoRainW ?? 0)) / wet.qLiquidW).toBeLessThan(0.4);
    // Same inputs without rain still reject > 60 % of the rainy value (rain adds only ~ +55 % on the dry value).
    expect(dry.regime).toBe('reject');
    expect(-dry.qLiquidW / -wet.qLiquidW).toBeGreaterThan(0.6);
    // A dry, dark, windy night rejects MORE than the rainy preset's dry equivalent, and about as much as 80 % of it.
    expect(-night.qLiquidW).toBeGreaterThan(-dry.qLiquidW);
    expect(-night.qLiquidW / -wet.qLiquidW).toBeGreaterThan(0.75);
  });

  it('rain term bounded by full equilibration (eps = 1): 17.4 W/m2K at 15 mm/h', () => {
    const bound = (p.rainMmH / 3600) * K.cpWater;
    expect(bound).toBeCloseTo(17.4, 1);
    expect(wet.coefficients.hRain).toBeLessThan(bound);
    expect(wet.coefficients.hRain / bound).toBeCloseTo(K.rainEffectiveness, 6);
  });

  it('effective panel-to-ambient conductance is ~20 W/(m2 K) (unglazed-laminate class), not a dry-cooler class number', () => {
    const uaPerM2 = -wet.qLiquidW / (p.inletC - p.ambientC) / A;
    expect(uaPerM2).toBeGreaterThan(15);
    expect(uaPerM2).toBeLessThan(25);
  });
});

describe('valuation baseline for rejection (review finding P0-1)', () => {
  it('rainy preset values rejection against a dry cooler (COP 30): modest net benefit; a chiller baseline is opt-in', () => {
    expect(PRESETS.rainy.coolingCOP).toBe(30);
    const base = simulate(PRESETS.rainy);
    expect(base.regime).toBe('reject');
    expect(base.netCoolingBenefitW).toBeGreaterThan(0);
    expect(base.netCoolingBenefitW).toBeLessThan(20);
    const chiller = simulate({ ...PRESETS.rainy, coolingCOP: 3.5 });
    expect(chiller.netCoolingBenefitW).toBeGreaterThan(100);
  });

  it('coolingCOP can represent a dry-cooler / free-cooling baseline (limit 60) and is not silently clamped', () => {
    expect(INPUT_LIMITS.coolingCOP.max).toBe(60);
    expect(INPUT_LIMITS.coolingCOP.help).toMatch(/dry cooler/i);
    const a = simulate({ ...PRESETS.rainy, coolingCOP: 20 }).avoidedCoolingElecW;
    const b = simulate({ ...PRESETS.rainy, coolingCOP: 50 }).avoidedCoolingElecW;
    expect(a).toBeGreaterThan(b);
  });
});

describe('visual mapping must follow the computed sign of qLiquid, not valuation flags (review finding P1-1)', () => {
  const forcedNoLoad = simulate({ ...PRESETS.sunny, pumpControl: 'on', heatLoadAvailable: false });
  const forcedNoSource = simulate({ ...PRESETS.rainy, pumpControl: 'on', hotSourceAvailable: false });

  it('precondition: real heat moves although regime is "negligible"', () => {
    expect(forcedNoLoad.regime).toBe('negligible');
    expect(forcedNoLoad.qLiquidW).toBeGreaterThan(500);
    expect(forcedNoSource.regime).toBe('negligible');
    expect(forcedNoSource.qLiquidW).toBeLessThan(-500);
  });

  it('stack arrows point down when q > +20 W and the pump runs (even with no heat load)', () => {
    expect(deriveTargets(forcedNoLoad, true).stackDir).toBe(-1);
  });

  it('stack arrows point up when q < -20 W and the pump runs (even with no hot source)', () => {
    expect(deriveTargets(forcedNoSource, true).stackDir).toBe(1);
  });

  it('arrows derived from regime in the normal presets still point the right way', () => {
    expect(deriveTargets(simulate(PRESETS.sunny), true).stackDir).toBe(-1);
    expect(deriveTargets(simulate(PRESETS.rainy), true).stackDir).toBe(1);
    expect(deriveTargets(simulate(PRESETS.sunny, 'conventional-pv'), true).stackDir).toBe(0);
  });
});

describe('glass / laminate resistance consistency (review finding P1-3)', () => {
  it('front convection/IR/rain use the glass surface temperature that the profile reports; U_cg links glass and cell', () => {
    const r = simulate(PRESETS.rainy);
    const glass = r.profile.find((n) => n.id === 'glass')?.tempC ?? NaN;
    expect(r.cellC - glass).toBeGreaterThan(1.5);
    // rain heat is evaluated at the glass surface
    const qRainAtGlass = A * r.coefficients.hRain * (glass - (r.inputs.ambientC - K.rainTempOffsetK));
    expect(Math.abs(r.qRainW - qRainAtGlass)).toBeLessThan(1e-6);
    // series resistance: total front heat = U_cg * A * (T_cell - T_glass)
    expect(r.coefficients.uCellGlass).toBe(K.uCellGlass);
    expect(Math.abs(r.qFrontLossW + r.qRainW - A * K.uCellGlass * (r.cellC - glass))).toBeLessThan(1e-4);
  });
});

describe('sunny preset flatters the thermal side (review finding P1-5)', () => {
  it('eta_th falls from 57 % at T_in = 30 C to < 20 % at 60 C; PV gain over conventional disappears by ~ 50 C', () => {
    const at = (tin: number) => compareConfigurations({ ...PRESETS.sunny, inletC: tin });
    const c30 = at(30);
    const c60 = at(60);
    expect(c30['solarvein-dual'].qLiquidW / c30['solarvein-dual'].solarInputW).toBeGreaterThan(0.55);
    expect(c60['solarvein-dual'].qLiquidW / c60['solarvein-dual'].solarInputW).toBeLessThan(0.2);
    expect(c60['solarvein-dual'].electricalW).toBeLessThan(c60['conventional-pv'].electricalW);
  });
});
