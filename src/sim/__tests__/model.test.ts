/**
 * Collector model invariants on the v2 configurations ('pvt-liquid' and 'conventional-pv').
 * Ported from the v1 suite: the energy balance, ε-NTU, pump, stagnation and monotonicity checks stay;
 * the dual-mode rejection / dry-cooler cases are gone with the concept.
 */
import { describe, expect, it } from 'vitest';
import { clampInputs, simulate } from '../model';
import { DEFAULT_INPUTS, INPUT_LIMITS, type NumericInputKey } from '../presets';
import { referenceResult } from '../reference';
import type { CollectorConfig, SimInputs, SimResult } from '../types';

const CONFIGS: CollectorConfig[] = ['conventional-pv', 'pvt-liquid'];
const SUNNY: SimInputs = clampInputs(DEFAULT_INPUTS);
const base = (o: Partial<SimInputs> = {}): SimInputs => ({ ...DEFAULT_INPUTS, ...o });

function allFinite(r: SimResult): boolean {
  const nums: number[] = [
    r.cellC, r.stagnationC, r.inletC, r.outletC, r.deltaFluidK, r.massFlowKgS, r.solarInputW, r.opticalLossW,
    r.absorbedW, r.electricalW, r.etaElectrical, r.qLiquidW, r.qFrontLossW, r.qRainW, r.qBackLossW, r.pumpW,
    r.netElectricalW, r.energyBalanceResidualW, r.usefulHeatW, r.avoidedFuelW,
    ...Object.values(r.coefficients),
    ...r.profile.map((p) => p.tempC),
  ];
  return nums.every((x) => Number.isFinite(x));
}

describe('energy conservation & robustness (grid)', () => {
  it('residual < 0.5 W, no NaN, sign/flow invariants over a large input grid', () => {
    let n = 0;
    for (const irradiance of [0, 60, 400, 900, 1200])
      for (const ambientC of [10, 28, 45])
        for (const rainMmH of [0, 5, 60])
          for (const windMs of [0, 3, 10])
            for (const inletC of [10, 45, 80])
              for (const flowLpm of [0.3, 2, 10])
                for (const pumpControl of ['auto', 'on', 'off'] as const)
                  for (const heatLoadAvailable of [true, false]) {
                    const inp = base({ irradiance, ambientC, rainMmH, windMs, inletC, flowLpm, pumpControl, heatLoadAvailable });
                    for (const cfg of CONFIGS) {
                      const r = simulate(inp, cfg);
                      n++;
                      expect(Math.abs(r.energyBalanceResidualW)).toBeLessThan(0.5);
                      expect(allFinite(r)).toBe(true);
                      if (r.pumpOn) {
                        expect(r.massFlowKgS).toBeGreaterThan(0);
                        expect(r.qLiquidW).toBeCloseTo(r.massFlowKgS * 4180 * r.deltaFluidK, 6);
                        expect(Math.sign(r.deltaFluidK)).toBe(Math.sign(r.qLiquidW));
                      } else {
                        expect(r.qLiquidW).toBe(0);
                        expect(r.pumpW).toBe(0);
                        expect(r.regime).toBe('idle');
                      }
                      if (!heatLoadAvailable) expect(r.usefulHeatW).toBe(0);
                      expect(r.usefulHeatW).toBeGreaterThanOrEqual(0);
                      expect(r.cellC).toBeGreaterThan(-10);
                    }
                  }
    expect(n).toBeGreaterThan(5000);
  }, 120_000);

  it('handles night (G=0) with every config', () => {
    for (const cfg of CONFIGS) {
      const r = simulate(base({ irradiance: 0 }), cfg);
      expect(r.etaElectrical).toBe(0);
      expect(r.electricalW).toBe(0);
      expect(allFinite(r)).toBe(true);
    }
  });
});

describe('clampInputs', () => {
  it('clamps to INPUT_LIMITS and replaces NaN / Infinity with defaults', () => {
    const wild = {
      ...DEFAULT_INPUTS,
      irradiance: 9999, ambientC: -50, rainMmH: Number.NaN, windMs: Infinity, inletC: -Infinity,
      flowLpm: 0, areaM2: 100, uPlateFluid: -3, pressureDropKPa: 1e9, pumpEfficiency: 5, etaRef: 0.9,
      betaPerK: 0, boilerEfficiency: 2,
    };
    const c = clampInputs(wild);
    (Object.keys(INPUT_LIMITS) as NumericInputKey[]).forEach((k) => {
      expect(Number.isFinite(c[k])).toBe(true);
      expect(c[k]).toBeGreaterThanOrEqual(INPUT_LIMITS[k].min);
      expect(c[k]).toBeLessThanOrEqual(INPUT_LIMITS[k].max);
    });
    expect(c.irradiance).toBe(INPUT_LIMITS.irradiance.max);
    expect(c.rainMmH).toBe(DEFAULT_INPUTS.rainMmH);
    expect(c.windMs).toBe(DEFAULT_INPUTS.windMs);
    const r = simulate(wild, 'pvt-liquid');
    expect(allFinite(r)).toBe(true);
    expect(r.inputs.irradiance).toBe(INPUT_LIMITS.irradiance.max);
  });

  it('leaves valid inputs untouched', () => {
    expect(clampInputs(SUNNY)).toEqual(SUNNY);
  });
});

describe('calibration', () => {
  it('conventional PV at NOCT-like conditions (800 W/m2, 20 C, 1 m/s) gives T_cell 42-48 C', () => {
    const r = simulate(base({ irradiance: 800, ambientC: 20, windMs: 1, rainMmH: 0 }), 'conventional-pv');
    expect(r.cellC).toBeGreaterThan(42);
    expect(r.cellC).toBeLessThan(48);
    expect(r.pumpOn).toBe(false);
    expect(r.regime).toBe('idle');
    expect(r.qLiquidW).toBe(0);
  });

  it('electrical efficiency decreases with temperature (hotter ambient gives lower eta)', () => {
    const cold = simulate(base({ ambientC: 15 }), 'conventional-pv');
    const hot = simulate(base({ ambientC: 40 }), 'conventional-pv');
    expect(hot.cellC).toBeGreaterThan(cold.cellC);
    expect(hot.etaElectrical).toBeLessThan(cold.etaElectrical);
  });
});

describe('reference state (clear noon, 40 C loop, pump auto)', () => {
  const r = simulate(SUNNY, 'pvt-liquid');
  it('harvests heat', () => {
    expect(r.regime).toBe('harvest');
    expect(r.pumpOn).toBe(true);
    expect(r.qLiquidW).toBeGreaterThan(300);
    expect(r.outletC).toBeGreaterThan(r.inletC);
    expect(r.deltaFluidK).toBeGreaterThan(0);
    expect(r.usefulHeatW).toBeCloseTo(r.qLiquidW, 9);
    expect(r.avoidedFuelW).toBeCloseTo(r.usefulHeatW / r.inputs.boilerEfficiency, 9);
  });
  it('cell is cooler than stagnation and gains electricity vs pump-off', () => {
    expect(r.cellC).toBeLessThan(r.stagnationC - 10);
    const off = simulate({ ...SUNNY, pumpControl: 'off' }, 'pvt-liquid');
    expect(off.pumpOn).toBe(false);
    expect(off.cellC).toBeCloseTo(r.stagnationC, 6);
    expect(r.electricalW).toBeGreaterThan(off.electricalW);
    expect(r.netElectricalW).toBeGreaterThan(off.netElectricalW);
  });
  it('pump power is small and tallied', () => {
    expect(r.pumpW).toBeGreaterThan(1);
    expect(r.pumpW).toBeLessThan(15);
    expect(r.netElectricalW).toBeCloseTo(r.electricalW - r.pumpW, 9);
  });
  it('is what the walk-through shows (referenceResult)', () => {
    const ref = referenceResult();
    expect(ref.config).toBe('pvt-liquid');
    expect(ref.cellC).toBe(r.cellC);
    expect(ref.outletC).toBe(r.outletC);
    expect(ref.qBackLossW).toBe(r.qBackLossW);
    expect(ref.profile.find((n) => n.id === 'absorber')?.tempC).toBe(r.profile.find((n) => n.id === 'absorber')?.tempC);
  });
});

describe('controller & advisories', () => {
  it('stagnation: PVT without pump is hotter than conventional PV in strong sun', () => {
    const inp = { ...SUNNY, heatLoadAvailable: false };
    const pvt = simulate(inp, 'pvt-liquid');
    const conv = simulate(inp, 'conventional-pv');
    expect(pvt.pumpOn).toBe(false);
    expect(pvt.cellC).toBeGreaterThan(conv.cellC + 5);
    expect(pvt.stagnationC).toBeCloseTo(pvt.cellC, 9);
    expect(pvt.advisories.some((a) => a.code === 'NO_HEAT_LOAD')).toBe(true);
  });
  it('STAGNATION_HOT raised when stagnation is 75-100 C with pump off', () => {
    const r = simulate({ ...SUNNY, heatLoadAvailable: false, irradiance: 1000, ambientC: 35 }, 'pvt-liquid');
    expect(r.stagnationC).toBeGreaterThan(75);
    expect(r.stagnationC).toBeLessThan(100);
    expect(r.advisories.some((a) => a.code === 'STAGNATION_HOT')).toBe(true);
    expect(r.advisories.some((a) => a.code === 'STAGNATION_BOILING')).toBe(false);
  });
  it('STAGNATION_BOILING (critical) mentions boiling and pressure when stagnation > 100 C', () => {
    const r = simulate({ ...SUNNY, heatLoadAvailable: false, irradiance: 1200, ambientC: 45, windMs: 0 }, 'pvt-liquid');
    expect(r.stagnationC).toBeGreaterThan(100);
    const a = r.advisories.find((x) => x.code === 'STAGNATION_BOILING');
    expect(a).toBeDefined();
    expect(a!.severity).toBe('critical');
    expect(a!.message).toMatch(/mendidih/);
    expect(a!.message).toMatch(/tekanan/);
  });
  it('LOW_IRRADIANCE under G < 150', () => {
    expect(simulate(base({ irradiance: 100 }), 'pvt-liquid').advisories.some((a) => a.code === 'LOW_IRRADIANCE')).toBe(true);
    expect(simulate(base({ irradiance: 600 }), 'pvt-liquid').advisories.some((a) => a.code === 'LOW_IRRADIANCE')).toBe(false);
  });
  it('negligible regime always carries an explanation', () => {
    const r = simulate(base({ irradiance: 20, heatLoadAvailable: true, pumpControl: 'on' }), 'pvt-liquid');
    expect(r.regime).toBe('negligible');
    expect(r.advisories.length).toBeGreaterThan(0);
  });
  it('conventional PV: pump never runs even if forced', () => {
    const r = simulate({ ...SUNNY, pumpControl: 'on' }, 'conventional-pv');
    expect(r.pumpOn).toBe(false);
    expect(r.massFlowKgS).toBe(0);
    expect(r.profile.some((p) => p.id === 'fluid')).toBe(false);
  });
  it('pump electricity can exceed the harvest benefit (high dP, high flow, weak sun)', () => {
    const inp = { ...SUNNY, inletC: 25, irradiance: 150, pressureDropKPa: 80, flowLpm: 10 };
    const forced = simulate({ ...inp, pumpControl: 'on' }, 'pvt-liquid');
    expect(forced.advisories.some((a) => a.code === 'PUMP_EXCEEDS_BENEFIT')).toBe(true);
    expect(simulate(inp, 'pvt-liquid').pumpOn).toBe(false);
  });
});

describe('monotonic behaviour', () => {
  it('higher irradiance gives higher cell temperature (pump off, pump on, conventional)', () => {
    for (const cfg of CONFIGS)
      for (const pumpControl of ['on', 'off'] as const) {
        let prev = -Infinity;
        for (let g = 0; g <= 1200; g += 100) {
          const r = simulate({ ...SUNNY, irradiance: g, pumpControl }, cfg);
          expect(r.cellC).toBeGreaterThan(prev);
          prev = r.cellC;
        }
      }
  });
  it('more rain gives lower or equal panel temperature in daytime sun', () => {
    for (const cfg of CONFIGS) {
      let prev = Infinity;
      for (let rain = 0; rain <= 60; rain += 1) {
        const r = simulate({ ...SUNNY, irradiance: 700, rainMmH: rain, pumpControl: 'off' }, cfg);
        expect(r.cellC).toBeLessThanOrEqual(prev + 1e-9);
        prev = r.cellC;
      }
    }
  });
  it('higher T_in in harvest gives less heat to the liquid', () => {
    let prev = Infinity;
    for (let t = 15; t <= 70; t += 5) {
      const r = simulate({ ...SUNNY, inletC: t, pumpControl: 'on' }, 'pvt-liquid');
      expect(r.qLiquidW).toBeLessThan(prev);
      prev = r.qLiquidW;
    }
  });
  it('more wind gives a cooler conventional panel', () => {
    const a = simulate(base({ windMs: 0 }), 'conventional-pv').cellC;
    const b = simulate(base({ windMs: 5 }), 'conventional-pv').cellC;
    expect(b).toBeLessThan(a);
  });
  it('liquid heat sign follows T_in vs panel temperature while flow direction stays inlet to outlet', () => {
    const lowIn = simulate({ ...SUNNY, inletC: 15, pumpControl: 'on' }, 'pvt-liquid');
    const highIn = simulate({ ...SUNNY, inletC: 80, pumpControl: 'on' }, 'pvt-liquid');
    expect(lowIn.qLiquidW).toBeGreaterThan(0);
    expect(highIn.qLiquidW).toBeLessThan(0);
    expect(highIn.massFlowKgS).toBeGreaterThan(0);
    expect(lowIn.massFlowKgS).toBeGreaterThan(0);
    expect(highIn.outletC).toBeLessThan(highIn.inletC);
    expect(lowIn.outletC).toBeGreaterThan(lowIn.inletC);
  });
});

describe('conventional PV can be the better electrical choice', () => {
  it('no heat load: a stagnating PVT yields less electricity than conventional PV', () => {
    const inp = { ...SUNNY, heatLoadAvailable: false };
    expect(simulate(inp, 'conventional-pv').netElectricalW).toBeGreaterThan(simulate(inp, 'pvt-liquid').netElectricalW);
  });
  it('forced pump with a high pressure drop and no useful heat: conventional wins as well', () => {
    const inp = { ...SUNNY, heatLoadAvailable: false, pressureDropKPa: 80, flowLpm: 6, pumpControl: 'on' as const };
    expect(simulate(inp, 'conventional-pv').netElectricalW).toBeGreaterThan(simulate(inp, 'pvt-liquid').netElectricalW);
  });
  it('with a heat load the PVT wins on electricity AND heat', () => {
    const pvt = simulate(SUNNY, 'pvt-liquid');
    expect(pvt.netElectricalW).toBeGreaterThan(simulate(SUNNY, 'conventional-pv').netElectricalW);
    expect(pvt.usefulHeatW).toBeGreaterThan(0);
  });
  it('both configs see the same G*A and split it into absorbed + optical loss', () => {
    const ga = SUNNY.irradiance * SUNNY.areaM2;
    for (const cfg of CONFIGS) {
      const r = simulate(SUNNY, cfg);
      expect(r.config).toBe(cfg);
      expect(r.solarInputW).toBeCloseTo(ga, 9);
      expect(r.solarInputW).toBeCloseTo(r.absorbedW + r.opticalLossW, 9);
    }
  });
});

describe('profile', () => {
  it('is ordered front to back with sensible values in sun with pump on', () => {
    const r = simulate(SUNNY, 'pvt-liquid');
    const ids = r.profile.map((p) => p.id);
    expect(ids).toEqual(['sky', 'ambient', 'glass', 'cell', 'absorber', 'fluid', 'back']);
    const t = Object.fromEntries(r.profile.map((p) => [p.id, p.tempC])) as Record<string, number>;
    expect(t.sky).toBeLessThan(t.ambient!);
    expect(t.glass).toBeGreaterThan(t.ambient!);
    expect(t.glass).toBeLessThan(t.cell!);
    expect(t.fluid).toBeLessThan(t.absorber!);
    expect(t.back).toBeGreaterThan(t.ambient!);
    expect(r.profile.every((p) => p.label.length > 0)).toBe(true);
  });
});
