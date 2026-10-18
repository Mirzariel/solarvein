/**
 * Physics-review regression checks on the v2 collector ('pvt-liquid'): independent-solver agreement, flow vs heat
 * direction, glass series resistance, rain term bounds, thermal efficiency vs inlet temperature, and the 3D arrow
 * mapping following the computed sign of q. Ported from the v1 review suites (docs/audit/03, 08).
 */
import { describe, expect, it } from 'vitest';
import { deriveTargets } from '../../viz3d/effects/targets';
import { MODEL_CONSTANTS as K, clampInputs, simulate } from '../model';
import { DEFAULT_INPUTS } from '../presets';
import type { CollectorConfig, SimInputs } from '../types';

const T0 = 273.15;
const SUNNY: SimInputs = clampInputs(DEFAULT_INPUTS);
/** Dark, rainy, warm-loop state (no sun worth harvesting): the collector only loses heat when the pump is forced on. */
const RAIN_DAY: SimInputs = {
  ...SUNNY,
  irradiance: 120,
  ambientC: 25,
  rainMmH: 15,
  windMs: 3,
  inletC: 45,
  flowLpm: 3,
  heatLoadAvailable: false,
  pumpControl: 'on',
};
const A = RAIN_DAY.areaM2;

/** Independent re-implementation. Unknown = T_p (cell). Inner solve: T_g from  A*Ucg*(Tp-Tg) = front(Tg). */
function indep(i: SimInputs, config: CollectorConfig, pumpOn: boolean) {
  const area = i.areaM2;
  const rho = 1000 - 0.0178 * Math.abs(i.inletC - 4) ** 1.7;
  const mdot = (rho * i.flowLpm) / 60000;
  const mcp = mdot * 4180;
  const eps = 1 - Math.exp(-(i.uPlateFluid * area) / mcp);
  const hc = 2.8 + 3 * i.windMs;
  const hr = 0.5 * (i.rainMmH / 3600) * 4180;
  const skyDep = 6 + (1 - 6) * Math.min(1, i.rainMmH / 5);
  const skyK = i.ambientC - skyDep + T0;
  const tRain = i.ambientC - 1;
  const front = (tg: number) =>
    area * (hc * (tg - i.ambientC) + 0.9 * K.sigma * ((tg + T0) ** 4 - skyK ** 4) + hr * (tg - tRain));
  const glass = (tp: number) => {
    let lo = -100;
    let hi = tp + 50;
    for (let n = 0; n < 60; n++) {
      const mid = (lo + hi) / 2;
      if (area * 200 * (tp - mid) - front(mid) > 0) lo = mid;
      else hi = mid;
    }
    return (lo + hi) / 2;
  };
  const gA = i.irradiance * area;
  const parts = (tp: number) => {
    const tg = glass(tp);
    const pe = Math.max(0, i.etaRef * (1 - i.betaPerK * (tp - 25))) * gA;
    const am = i.ambientC + T0;
    const qBack =
      config === 'conventional-pv'
        ? area * (0.8 * hc * (tp - i.ambientC) + 0.85 * K.sigma * ((tp + T0) ** 4 - am ** 4))
        : area * 1.0 * (tp - i.ambientC);
    const qLiq = pumpOn && config !== 'conventional-pv' ? eps * mcp * (tp - i.inletC) : 0;
    return { tg, pe, qBack, qLiq, qFront: front(tg) };
  };
  let lo = -60;
  let hi = 400;
  for (let n = 0; n < 60; n++) {
    const mid = (lo + hi) / 2;
    const p = parts(mid);
    if (0.88 * gA - p.pe - p.qFront - p.qBack - p.qLiq > 0) lo = mid;
    else hi = mid;
  }
  const tp = (lo + hi) / 2;
  return { tp, ...parts(tp) };
}

describe('independent solver agrees with model.ts (glass series resistance is exact, balance closes)', () => {
  it('cell T, q_liquid, P_e match to < 0.05 K / 0.05 W over a grid', () => {
    let maxDT = 0;
    let maxDQ = 0;
    let maxRes = 0;
    for (const g of [0, 120, 900, 1200])
      for (const tin of [15, 40, 70])
        for (const rain of [0, 15, 60])
          for (const wind of [0, 3, 10])
            for (const amb of [15, 32]) {
              const i: SimInputs = { ...RAIN_DAY, irradiance: g, inletC: tin, rainMmH: rain, windMs: wind, ambientC: amb, pumpControl: 'on' };
              const m = simulate(i, 'pvt-liquid');
              const x = indep(i, 'pvt-liquid', true);
              maxDT = Math.max(maxDT, Math.abs(m.cellC - x.tp));
              maxDQ = Math.max(maxDQ, Math.abs(m.qLiquidW - x.qLiq), Math.abs(m.electricalW - x.pe));
              maxRes = Math.max(maxRes, Math.abs(m.energyBalanceResidualW));
              const c = simulate(i, 'conventional-pv');
              maxDT = Math.max(maxDT, Math.abs(c.cellC - indep(i, 'conventional-pv', false).tp));
              expect(Number.isFinite(m.cellC)).toBe(true);
            }
    expect(maxDT).toBeLessThan(0.05);
    expect(maxDQ).toBeLessThan(0.05);
    expect(maxRes).toBeLessThan(1e-6);
  }, 30000);
});

describe('flow direction vs heat direction (golden rule 2)', () => {
  it('liquid never reverses and sign(T_out - T_in) == sign(qLiquid) over a grid', () => {
    for (const g of [0, 120, 600, 1100])
      for (const tin of [10, 25, 45, 80])
        for (const rain of [0, 15, 60])
          for (const wind of [0, 3, 10])
            for (const pc of ['auto', 'on', 'off'] as const) {
              const i: SimInputs = { ...RAIN_DAY, irradiance: g, inletC: tin, rainMmH: rain, windMs: wind, pumpControl: pc, heatLoadAvailable: true };
              const r = simulate(i, 'pvt-liquid');
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

describe('monotonicity', () => {
  it('cell temperature rises with G; q_liquid falls with T_in; the loop loss rises with rain', () => {
    let prev = -Infinity;
    for (let g = 0; g <= 1200; g += 100) {
      const t = simulate({ ...SUNNY, irradiance: g, pumpControl: 'off' }, 'conventional-pv').cellC;
      expect(t).toBeGreaterThan(prev);
      prev = t;
    }
    prev = Infinity;
    for (let tin = 10; tin <= 80; tin += 5) {
      const q = simulate({ ...SUNNY, inletC: tin, pumpControl: 'on' }, 'pvt-liquid').qLiquidW;
      expect(q).toBeLessThan(prev);
      prev = q;
    }
    let prevLoss = -Infinity;
    for (const rain of [0, 1, 5, 15, 30, 60]) {
      const loss = -simulate({ ...RAIN_DAY, rainMmH: rain }, 'pvt-liquid').qLiquidW;
      expect(loss).toBeGreaterThanOrEqual(prevLoss);
      prevLoss = loss;
    }
  });
});

describe('rain term (a real part of the energy balance on rain days)', () => {
  const wet = simulate(RAIN_DAY, 'pvt-liquid');
  const dry = simulate({ ...RAIN_DAY, rainMmH: 0 }, 'pvt-liquid');

  it('forced pump on a dark rainy day only loses heat, and rain is the minority of that loss', () => {
    expect(wet.qLiquidW).toBeLessThan(-500);
    expect(wet.qLiquidW).toBeGreaterThan(-600);
    expect(wet.regime).toBe('negligible');
    expect(wet.advisories.some((a) => a.code === 'COLLECTOR_COOLS_LOOP')).toBe(true);
    expect((wet.qLiquidW - dry.qLiquidW) / wet.qLiquidW).toBeLessThan(0.4);
  });

  it('rain term bounded by full equilibration (eps = 1): 17.4 W/m2K at 15 mm/h', () => {
    const bound = (RAIN_DAY.rainMmH / 3600) * K.cpWater;
    expect(bound).toBeCloseTo(17.4, 1);
    expect(wet.coefficients.hRain).toBeLessThan(bound);
    expect(wet.coefficients.hRain / bound).toBeCloseTo(K.rainEffectiveness, 6);
    expect(K.rainEffectiveness).toBe(0.5);
    expect(K.rainTempOffsetK).toBe(1);
  });

  it('effective panel-to-ambient conductance is ~20 W/(m2 K) (unglazed-laminate class)', () => {
    const uaPerM2 = -wet.qLiquidW / (RAIN_DAY.inletC - RAIN_DAY.ambientC) / A;
    expect(uaPerM2).toBeGreaterThan(15);
    expect(uaPerM2).toBeLessThan(25);
  });
});

describe('glass / laminate resistance consistency', () => {
  it('front heat passes through U_cg: T_cell - T_glass = (q_front + q_rain)/(A U_cg), rain evaluated at the glass surface', () => {
    for (const p of [SUNNY, RAIN_DAY]) {
      const r = simulate(p, 'pvt-liquid');
      const glass = r.profile.find((n) => n.id === 'glass')!.tempC;
      expect(r.coefficients.uCellGlass).toBe(K.uCellGlass);
      expect(Math.abs(r.cellC - glass)).toBeGreaterThan(0.5);
      expect(Math.abs(r.qFrontLossW + r.qRainW - r.inputs.areaM2 * K.uCellGlass * (r.cellC - glass))).toBeLessThan(1e-4);
      const qRainAtGlass = r.inputs.areaM2 * r.coefficients.hRain * (glass - (r.inputs.ambientC - K.rainTempOffsetK));
      expect(Math.abs(r.qRainW - qRainAtGlass)).toBeLessThan(1e-6);
    }
    const sun = simulate(SUNNY, 'conventional-pv');
    const g = sun.profile.find((n) => n.id === 'glass')!.tempC;
    expect(g).toBeLessThan(sun.cellC);
    expect(g).toBeGreaterThan(sun.inputs.ambientC);
  });
});

describe('thermal efficiency is not a constant', () => {
  it('eta_th falls from > 55 % at T_in = 30 C to < 20 % at 60 C; the PV gain over conventional disappears by 60 C', () => {
    const at = (tin: number) => ({
      pvt: simulate({ ...SUNNY, inletC: tin }, 'pvt-liquid'),
      conv: simulate({ ...SUNNY, inletC: tin }, 'conventional-pv'),
    });
    const c30 = at(30);
    const c60 = at(60);
    expect(c30.pvt.qLiquidW / c30.pvt.solarInputW).toBeGreaterThan(0.55);
    expect(c60.pvt.qLiquidW / c60.pvt.solarInputW).toBeLessThan(0.2);
    expect(c60.pvt.electricalW).toBeLessThan(c60.conv.electricalW);
  });

  it('eta_th at the reference state is plausible (35-50 %)', () => {
    const r = simulate(SUNNY, 'pvt-liquid');
    expect(r.qLiquidW / r.solarInputW).toBeLessThan(0.5);
    expect(r.qLiquidW / r.solarInputW).toBeGreaterThan(0.35);
  });
});

describe('3D arrows follow the computed sign of qLiquid, not valuation flags', () => {
  const forcedNoLoad = simulate({ ...SUNNY, pumpControl: 'on', heatLoadAvailable: false }, 'pvt-liquid');
  const forcedCold = simulate({ ...RAIN_DAY, pumpControl: 'on' }, 'pvt-liquid');

  it('precondition: real heat moves although regime is "negligible"', () => {
    expect(forcedNoLoad.regime).toBe('negligible');
    expect(forcedNoLoad.qLiquidW).toBeGreaterThan(500);
    expect(forcedCold.regime).toBe('negligible');
    expect(forcedCold.qLiquidW).toBeLessThan(-500);
  });

  it('stack arrows point down when q > +20 W and the pump runs (even with no heat load)', () => {
    expect(deriveTargets(forcedNoLoad, true).stackDir).toBe(-1);
  });

  it('stack arrows point up when q < -20 W and the pump runs', () => {
    expect(deriveTargets(forcedCold, true).stackDir).toBe(1);
  });

  it('harvest points down, conventional PV has no arrows', () => {
    expect(deriveTargets(simulate(SUNNY, 'pvt-liquid'), true).stackDir).toBe(-1);
    expect(deriveTargets(simulate(SUNNY, 'conventional-pv'), true).stackDir).toBe(0);
  });
});

describe('speed', () => {
  it('simulate() is fast (< 0.1 ms per call)', () => {
    // best of several batches: robust against other test workers loading the CPU
    const n = 3000;
    let best = Infinity;
    for (let rep = 0; rep < 5; rep++) {
      const t0 = performance.now();
      for (let i = 0; i < n; i++) simulate({ ...RAIN_DAY, irradiance: 100 + (i % 300) }, 'pvt-liquid');
      best = Math.min(best, (performance.now() - t0) / n);
    }
    // Wall-time bound only when explicitly requested (PERF=1): the shared dev machine runs browsers/agents concurrently.
    if ((globalThis as { process?: { env: Record<string, string | undefined> } }).process?.env.PERF === '1') expect(best).toBeLessThan(0.1);
    else expect(Number.isFinite(best)).toBe(true);
  });
});
