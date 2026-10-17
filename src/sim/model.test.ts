import { describe, expect, it } from 'vitest';
import { clampInputs, compareConfigurations, simulate } from './model';
import { DEFAULT_INPUTS, INPUT_LIMITS, PRESETS, type NumericInputKey } from './presets';
import type { CollectorConfig, SimInputs, SimResult } from './types';

const CONFIGS: CollectorConfig[] = ['conventional-pv', 'pvt-harvest-only', 'solarvein-dual', 'pvt-liquid'];
const base = (o: Partial<SimInputs> = {}): SimInputs => ({ ...DEFAULT_INPUTS, ...o });

function allFinite(r: SimResult): boolean {
  const nums: number[] = [
    r.cellC, r.stagnationC, r.inletC, r.outletC, r.deltaFluidK, r.massFlowKgS, r.solarInputW, r.opticalLossW,
    r.absorbedW, r.electricalW, r.etaElectrical, r.qLiquidW, r.qFrontLossW, r.qRainW, r.qBackLossW, r.pumpW,
    r.netElectricalW, r.energyBalanceResidualW, r.usefulHeatW, r.heatRejectedW, r.avoidedFuelW,
    r.avoidedCoolingElecW, r.netCoolingBenefitW,
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
                  for (const [heatLoadAvailable, hotSourceAvailable] of [
                    [true, false],
                    [false, true],
                    [true, true],
                    [false, false],
                  ] as const) {
                    const inp = base({
                      irradiance, ambientC, rainMmH, windMs, inletC, flowLpm, pumpControl,
                      heatLoadAvailable, hotSourceAvailable,
                    });
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
                      if (!hotSourceAvailable) expect(r.heatRejectedW).toBe(0);
                      if (!heatLoadAvailable) expect(r.usefulHeatW).toBe(0);
                      expect(r.usefulHeatW).toBeGreaterThanOrEqual(0);
                      expect(r.heatRejectedW).toBeGreaterThanOrEqual(0);
                      expect(r.cellC).toBeGreaterThan(-10);
                    }
                  }
    expect(n).toBeGreaterThan(10000);
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
      betaPerK: 0, boilerEfficiency: 2, coolingCOP: 0,
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
    const r = simulate(wild);
    expect(allFinite(r)).toBe(true);
    expect(r.inputs.irradiance).toBe(INPUT_LIMITS.irradiance.max);
  });

  it('leaves valid inputs untouched', () => {
    expect(clampInputs(PRESETS.sunny)).toEqual(PRESETS.sunny);
    expect(clampInputs(PRESETS.rainy)).toEqual(PRESETS.rainy);
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

describe('sunny preset (harvest)', () => {
  const r = simulate(PRESETS.sunny);
  it('harvests heat', () => {
    expect(r.regime).toBe('harvest');
    expect(r.pumpOn).toBe(true);
    expect(r.qLiquidW).toBeGreaterThan(300);
    expect(r.outletC).toBeGreaterThan(r.inletC);
    expect(r.deltaFluidK).toBeGreaterThan(0);
    expect(r.usefulHeatW).toBeCloseTo(r.qLiquidW, 9);
    expect(r.avoidedFuelW).toBeCloseTo(r.usefulHeatW / r.inputs.boilerEfficiency, 9);
    expect(r.heatRejectedW).toBe(0);
  });
  it('cell is cooler than stagnation and gains electricity vs pump-off', () => {
    expect(r.cellC).toBeLessThan(r.stagnationC - 10);
    const off = simulate({ ...PRESETS.sunny, pumpControl: 'off' });
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
});

describe('rainy preset (rejection)', () => {
  const r = simulate(PRESETS.rainy);
  it('rejects heat from the hot loop', () => {
    expect(r.regime).toBe('reject');
    expect(r.pumpOn).toBe(true);
    expect(r.qLiquidW).toBeLessThan(0);
    expect(r.outletC).toBeLessThan(r.inletC);
    expect(r.heatRejectedW).toBeCloseTo(-r.qLiquidW, 9);
    expect(r.usefulHeatW).toBe(0);
    expect(r.netCoolingBenefitW).toBeGreaterThan(0);
  });
  it('heat flows liquid to panel to environment', () => {
    expect(r.inletC).toBeGreaterThan(r.cellC);
    expect(r.cellC).toBeGreaterThan(r.inputs.ambientC);
    expect(r.qFrontLossW).toBeGreaterThan(0);
    expect(r.qRainW).toBeGreaterThan(0);
    expect(r.qBackLossW).toBeGreaterThan(0);
    // the environment receives more than the net absorbed solar heat: the excess comes from the liquid
    expect(r.qFrontLossW + r.qRainW + r.qBackLossW).toBeGreaterThan(r.absorbedW - r.electricalW);
    expect(r.massFlowKgS).toBeGreaterThan(0);
    expect(r.inletC).toBe(45);
  });
  it('rain dominates the back loss', () => {
    expect(r.qRainW).toBeGreaterThan(r.qBackLossW);
    expect(r.coefficients.hRain).toBeGreaterThan(5);
  });
  it('is the same physics as the sunny preset (only the inputs differ)', () => {
    const r2 = simulate({ ...PRESETS.sunny, ...PRESETS.rainy });
    expect(r2.cellC).toBeCloseTo(r.cellC, 9);
  });
});

describe('rejection is refused when it would not help', () => {
  const inp = { ...PRESETS.rainy, inletC: 22, ambientC: 25 };
  for (const cfg of ['solarvein-dual', 'pvt-harvest-only'] as const) {
    it(`${cfg}: not reject, advisory with exact message`, () => {
      const r = simulate(inp, cfg);
      expect(r.regime).not.toBe('reject');
      expect(r.heatRejectedW).toBe(0);
      const a = r.advisories.find((x) => x.code === 'REJECTION_NOT_BENEFICIAL');
      expect(a).toBeDefined();
      expect(a!.message).toBe('Pendinginan tidak menguntungkan pada kondisi ini.');
    });
  }
  it('forced pump on in the same case: negligible, no rejection credit, explained', () => {
    const r = simulate({ ...inp, pumpControl: 'on' });
    expect(r.regime).toBe('negligible');
    expect(r.qLiquidW).toBeGreaterThan(0); // panel warmer than the 22 C liquid
    expect(r.heatRejectedW).toBe(0);
    expect(r.advisories.some((a) => a.code === 'REJECTION_NOT_BENEFICIAL')).toBe(true);
    expect(r.advisories.some((a) => a.code === 'NEGLIGIBLE_EXCHANGE')).toBe(true);
  });
});

describe('no hot source means no rejection credit and no invented heat', () => {
  it('heatRejectedW = 0 for every config/pump setting', () => {
    for (const cfg of CONFIGS)
      for (const pumpControl of ['auto', 'on', 'off'] as const) {
        const r = simulate({ ...PRESETS.rainy, hotSourceAvailable: false, pumpControl }, cfg);
        expect(r.heatRejectedW).toBe(0);
        expect(r.avoidedCoolingElecW).toBe(0);
      }
  });
  it('forced-on with a warm loop but no hot source advises NO_HOT_SOURCE', () => {
    const r = simulate({ ...PRESETS.rainy, hotSourceAvailable: false, pumpControl: 'on' });
    expect(r.advisories.some((a) => a.code === 'NO_HOT_SOURCE')).toBe(true);
    expect(r.regime).toBe('negligible');
    expect(r.netCoolingBenefitW).toBeLessThan(0);
  });
  it('auto does not run the pump for nothing', () => {
    const r = simulate({ ...PRESETS.rainy, hotSourceAvailable: false });
    expect(r.pumpOn).toBe(false);
  });
});

describe('controller & advisories', () => {
  it('harvest-only never rejects, even when SolarVein would', () => {
    const hv = simulate(PRESETS.rainy, 'pvt-harvest-only');
    const sv = simulate(PRESETS.rainy, 'solarvein-dual');
    expect(hv.pumpOn).toBe(false);
    expect(hv.heatRejectedW).toBe(0);
    expect(sv.regime).toBe('reject');
    expect(hv.advisories.some((a) => a.code === 'HARVEST_ONLY_NO_REJECTION')).toBe(true);
  });
  it('stagnation: PVT without pump is hotter than conventional PV in strong sun', () => {
    const inp = { ...PRESETS.sunny, heatLoadAvailable: false };
    const pvt = simulate(inp, 'pvt-harvest-only');
    const conv = simulate(inp, 'conventional-pv');
    expect(pvt.pumpOn).toBe(false);
    expect(pvt.cellC).toBeGreaterThan(conv.cellC + 5);
    expect(pvt.stagnationC).toBeCloseTo(pvt.cellC, 9);
    expect(pvt.advisories.some((a) => a.code === 'NO_HEAT_LOAD')).toBe(true);
  });
  it('STAGNATION_HOT raised when stagnation is 75-100 C with pump off', () => {
    const r = simulate({ ...PRESETS.sunny, heatLoadAvailable: false, irradiance: 1000, ambientC: 35 });
    expect(r.stagnationC).toBeGreaterThan(75);
    expect(r.stagnationC).toBeLessThan(100);
    expect(r.advisories.some((a) => a.code === 'STAGNATION_HOT')).toBe(true);
    expect(r.advisories.some((a) => a.code === 'STAGNATION_BOILING')).toBe(false);
  });
  it('STAGNATION_BOILING (critical) mentions boiling and pressure when stagnation > 100 C', () => {
    const r = simulate({ ...PRESETS.sunny, heatLoadAvailable: false, irradiance: 1200, ambientC: 45, windMs: 0 });
    expect(r.stagnationC).toBeGreaterThan(100);
    const a = r.advisories.find((x) => x.code === 'STAGNATION_BOILING');
    expect(a).toBeDefined();
    expect(a!.severity).toBe('critical');
    expect(a!.message).toMatch(/mendidih/);
    expect(a!.message).toMatch(/tekanan/);
  });
  it('LOW_IRRADIANCE under G < 150', () => {
    expect(simulate(base({ irradiance: 100 })).advisories.some((a) => a.code === 'LOW_IRRADIANCE')).toBe(true);
    expect(simulate(base({ irradiance: 600 })).advisories.some((a) => a.code === 'LOW_IRRADIANCE')).toBe(false);
  });
  it('forced pump with no load and no source is explained, benefits are zero', () => {
    const r = simulate({ ...PRESETS.sunny, heatLoadAvailable: false, hotSourceAvailable: false, pumpControl: 'on' });
    expect(r.pumpOn).toBe(true);
    expect(r.usefulHeatW).toBe(0);
    expect(r.heatRejectedW).toBe(0);
    expect(r.regime).toBe('negligible');
    expect(r.advisories.some((a) => a.code === 'LOOP_NO_ENDPOINT')).toBe(true);
  });
  it('negligible regime always carries an explanation', () => {
    const r = simulate(base({ irradiance: 20, heatLoadAvailable: true, pumpControl: 'on' }));
    expect(r.regime).toBe('negligible');
    expect(r.advisories.length).toBeGreaterThan(0);
  });
  it('conventional PV: pump never runs even if forced', () => {
    const r = simulate({ ...PRESETS.sunny, pumpControl: 'on' }, 'conventional-pv');
    expect(r.pumpOn).toBe(false);
    expect(r.massFlowKgS).toBe(0);
    expect(r.profile.some((p) => p.id === 'fluid')).toBe(false);
  });
  it('pump electricity can exceed the harvest benefit (high dP, high flow, weak sun)', () => {
    const inp = { ...PRESETS.sunny, inletC: 25, irradiance: 150, pressureDropKPa: 80, flowLpm: 10 };
    const forced = simulate({ ...inp, pumpControl: 'on' });
    expect(forced.advisories.some((a) => a.code === 'PUMP_EXCEEDS_BENEFIT')).toBe(true);
    expect(simulate(inp).pumpOn).toBe(false);
  });
});

describe('monotonic behaviour', () => {
  it('higher irradiance gives higher cell temperature (pump off, pump on, conventional)', () => {
    for (const cfg of CONFIGS)
      for (const pumpControl of ['on', 'off'] as const) {
        let prev = -Infinity;
        for (let g = 0; g <= 1200; g += 100) {
          const r = simulate({ ...PRESETS.sunny, irradiance: g, pumpControl }, cfg);
          expect(r.cellC).toBeGreaterThan(prev);
          prev = r.cellC;
        }
      }
  });
  it('more rain gives lower or equal panel temperature in daytime sun', () => {
    for (const cfg of CONFIGS) {
      let prev = Infinity;
      for (let rain = 0; rain <= 60; rain += 1) {
        const r = simulate({ ...PRESETS.sunny, irradiance: 700, rainMmH: rain, pumpControl: 'off' }, cfg);
        expect(r.cellC).toBeLessThanOrEqual(prev + 1e-9);
        prev = r.cellC;
      }
    }
  });
  it('higher T_in in harvest gives less heat to the liquid', () => {
    let prev = Infinity;
    for (let t = 15; t <= 70; t += 5) {
      const r = simulate({ ...PRESETS.sunny, inletC: t, pumpControl: 'on' });
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
    const lowIn = simulate({ ...PRESETS.sunny, inletC: 15, pumpControl: 'on' });
    const highIn = simulate({ ...PRESETS.sunny, inletC: 80, pumpControl: 'on' });
    expect(lowIn.qLiquidW).toBeGreaterThan(0);
    expect(highIn.qLiquidW).toBeLessThan(0);
    expect(highIn.massFlowKgS).toBeGreaterThan(0);
    expect(lowIn.massFlowKgS).toBeGreaterThan(0);
    expect(highIn.outletC).toBeLessThan(highIn.inletC);
    expect(lowIn.outletC).toBeGreaterThan(lowIn.inletC);
  });
});

describe('conventional PV can be the better electrical choice', () => {
  it('no heat load, no hot source: stagnating PVT yields less electricity than conventional PV', () => {
    const inp = { ...PRESETS.sunny, heatLoadAvailable: false, hotSourceAvailable: false };
    const c = compareConfigurations(inp);
    expect(c['conventional-pv'].netElectricalW).toBeGreaterThan(c['solarvein-dual'].netElectricalW);
    expect(c['conventional-pv'].netElectricalW).toBeGreaterThan(c['pvt-harvest-only'].netElectricalW);
  });
  it('forced pump with a high pressure drop and no useful heat: conventional wins as well', () => {
    const inp = { ...PRESETS.sunny, heatLoadAvailable: false, pressureDropKPa: 80, flowLpm: 6, pumpControl: 'on' as const };
    const c = compareConfigurations(inp);
    expect(c['conventional-pv'].netElectricalW).toBeGreaterThan(c['solarvein-dual'].netElectricalW);
  });
  it('in the sunny preset the dual collector wins on electricity AND heat', () => {
    const c = compareConfigurations(PRESETS.sunny);
    expect(c['solarvein-dual'].netElectricalW).toBeGreaterThan(c['conventional-pv'].netElectricalW);
    expect(c['solarvein-dual'].usefulHeatW).toBeGreaterThan(0);
  });
});

describe('compareConfigurations', () => {
  it('returns all 3 configs with consistent G*A', () => {
    const c = compareConfigurations(PRESETS.sunny);
    expect(Object.keys(c).sort()).toEqual([...CONFIGS].sort());
    const ga = PRESETS.sunny.irradiance * PRESETS.sunny.areaM2;
    for (const cfg of CONFIGS) {
      expect(c[cfg].config).toBe(cfg);
      expect(c[cfg].solarInputW).toBeCloseTo(ga, 9);
      expect(c[cfg].solarInputW).toBeCloseTo(c[cfg].absorbedW + c[cfg].opticalLossW, 9);
    }
  });
  it('rainy: dual rejects, others do not', () => {
    const c = compareConfigurations(PRESETS.rainy);
    expect(c['solarvein-dual'].regime).toBe('reject');
    expect(c['pvt-harvest-only'].regime).toBe('idle');
    expect(c['conventional-pv'].regime).toBe('idle');
  });
});

describe('profile', () => {
  it('is ordered front to back with sensible values in sun with pump on', () => {
    const r = simulate(PRESETS.sunny);
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
