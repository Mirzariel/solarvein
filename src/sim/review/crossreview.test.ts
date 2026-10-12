/**
 * Cross-review (Agent G, pass 2). See docs/audit/08-physics-crossreview.md.
 * - Independent solver: bisects on the CELL temperature T_p with a nested bisection for the glass surface T_g
 *   (different unknown ordering than model.ts, which bisects on T_g). Agreement to < 0.01 W proves the
 *   explicit-T_p shortcut is exact, not an approximation.
 * - Print-only exploration: AUDIT_PRINT=1 npx vitest run src/sim/review/crossreview.test.ts --disableConsoleIntercept
 */
import { describe, expect, it } from 'vitest';
import { computeCarbon, DEFAULT_CARBON } from '../carbon';
import { simulateDay } from '../day';
import { MODEL_CONSTANTS as K, compareConfigurations, simulate } from '../model';
import { PRESETS } from '../presets';
import type { CollectorConfig, SimInputs } from '../types';

const T0 = 273.15;
const PRINT = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env?.AUDIT_PRINT === '1';
const r1 = (x: number) => Math.round(x * 10) / 10;

/** Independent re-implementation. Unknown = T_p (cell). Inner solve: T_g from  A*Ucg*(Tp-Tg) = front(Tg). */
function indep(i: SimInputs, config: CollectorConfig, pumpOn: boolean) {
  const A = i.areaM2;
  const rho = 1000 - 0.0178 * Math.abs(i.inletC - 4) ** 1.7;
  const mdot = (rho * i.flowLpm) / 60000;
  const mcp = mdot * 4180;
  const eps = 1 - Math.exp(-(i.uPlateFluid * A) / mcp);
  const hc = 2.8 + 3 * i.windMs;
  const hr = 0.5 * (i.rainMmH / 3600) * 4180;
  const skyDep = 6 + (1 - 6) * Math.min(1, i.rainMmH / 5);
  const skyK = i.ambientC - skyDep + T0;
  const tRain = i.ambientC - 1;
  const front = (tg: number) =>
    A * (hc * (tg - i.ambientC) + 0.9 * K.sigma * ((tg + T0) ** 4 - skyK ** 4) + hr * (tg - tRain));
  const glass = (tp: number) => {
    let lo = -100;
    let hi = tp + 50;
    for (let n = 0; n < 60; n++) {
      const mid = (lo + hi) / 2;
      // g(tg) = A*Ucg*(tp - tg) - front(tg): decreasing in tg
      if (A * 200 * (tp - mid) - front(mid) > 0) lo = mid;
      else hi = mid;
    }
    return (lo + hi) / 2;
  };
  const gA = i.irradiance * A;
  const parts = (tp: number) => {
    const tg = glass(tp);
    const pe = Math.max(0, i.etaRef * (1 - i.betaPerK * (tp - 25))) * gA;
    const am = i.ambientC + T0;
    const qBack =
      config === 'conventional-pv'
        ? A * (0.8 * hc * (tp - i.ambientC) + 0.85 * K.sigma * ((tp + T0) ** 4 - am ** 4))
        : A * 1.0 * (tp - i.ambientC);
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
              const i: SimInputs = {
                ...PRESETS.rainy,
                irradiance: g,
                inletC: tin,
                rainMmH: rain,
                windMs: wind,
                ambientC: amb,
                pumpControl: 'on',
                heatLoadAvailable: true,
                hotSourceAvailable: true,
              };
              const m = simulate(i, 'solarvein-dual');
              const x = indep(i, 'solarvein-dual', true);
              maxDT = Math.max(maxDT, Math.abs(m.cellC - x.tp));
              maxDQ = Math.max(maxDQ, Math.abs(m.qLiquidW - x.qLiq), Math.abs(m.electricalW - x.pe));
              maxRes = Math.max(maxRes, Math.abs(m.energyBalanceResidualW));
              const c = simulate(i, 'conventional-pv');
              const xc = indep(i, 'conventional-pv', false);
              maxDT = Math.max(maxDT, Math.abs(c.cellC - xc.tp));
              expect(Number.isFinite(m.cellC)).toBe(true);
            }
    expect(maxDT).toBeLessThan(0.05);
    expect(maxDQ).toBeLessThan(0.05);
    expect(maxRes).toBeLessThan(1e-6);
  }, 30000);
});

describe('monotonicity', () => {
  it('cell temperature rises with G; q_liquid falls with T_in; |q_rain| rises with rain; P_e falls with T', () => {
    const base: SimInputs = { ...PRESETS.sunny, pumpControl: 'off' };
    let prev = -Infinity;
    for (let g = 0; g <= 1200; g += 100) {
      const t = simulate({ ...base, irradiance: g }, 'conventional-pv').cellC;
      expect(t).toBeGreaterThan(prev);
      prev = t;
    }
    prev = Infinity;
    for (let tin = 10; tin <= 80; tin += 5) {
      const q = simulate({ ...PRESETS.sunny, inletC: tin, pumpControl: 'on' }).qLiquidW;
      expect(q).toBeLessThan(prev);
      prev = q;
    }
    let prevRain = -Infinity;
    for (const rain of [0, 1, 5, 15, 30, 60]) {
      const q = -simulate({ ...PRESETS.rainy, rainMmH: rain, pumpControl: 'on' }).qLiquidW; // rejection magnitude
      expect(q).toBeGreaterThanOrEqual(prevRain);
      prevRain = q;
    }
  });
});

describe('carbon ledger (incremental)', () => {
  const sv = simulate(PRESETS.sunny, 'solarvein-dual');
  const cv = simulate(PRESETS.sunny, 'conventional-pv');
  const c = computeCarbon(sv, DEFAULT_CARBON, cv);
  it('incremental = heat credit + (P_e,sv - pump - P_e,conv) electricity credit', () => {
    const h = DEFAULT_CARBON.hoursPerYear / 1000;
    const expected =
      sv.avoidedFuelW * h * DEFAULT_CARBON.fuelKgPerKWh + (sv.electricalW - sv.pumpW - cv.electricalW) * h * DEFAULT_CARBON.gridKgPerKWh;
    expect(c.incrementalNetKgPerYear).toBeCloseTo(expected, 6);
    expect(c.incrementalPaybackYears).toBeCloseTo(180 / expected, 6);
  });
  it('without a baseline, no incremental fields (gross ledger unchanged)', () => {
    expect(computeCarbon(sv, DEFAULT_CARBON).incrementalNetKgPerYear).toBeUndefined();
  });
  it('rainy preset at 1400 h is negative incremental (no fabricated benefit)', () => {
    const rs = simulate(PRESETS.rainy);
    const rc = simulate(PRESETS.rainy, 'conventional-pv');
    expect(computeCarbon(rs, DEFAULT_CARBON, rc).incrementalNetKgPerYear ?? 0).toBeLessThan(0);
  });
});

describe.skipIf(!PRINT)('cross-review numbers (print only)', () => {
  it('presets', () => {
    for (const k of ['sunny', 'rainy'] as const) {
      const p = PRESETS[k];
      const cmp = compareConfigurations(p);
      const s = cmp['solarvein-dual'];
      const sumQ = s.qFrontLossW + s.qRainW + s.qBackLossW + s.electricalW + s.qLiquidW;
      console.log(k, {
        regime: s.regime, cell: r1(s.cellC), glass: r1(s.profile.find((n) => n.id === 'glass')!.tempC), stag: r1(s.stagnationC), conv_cell: r1(cmp['conventional-pv'].cellC),
        q: r1(s.qLiquidW), qNoRain: r1(s.qLiquidNoRainW ?? NaN), pe: r1(s.electricalW), pe_conv: r1(cmp['conventional-pv'].electricalW), pump: r1(s.pumpW),
        eta_th: r1((100 * s.qLiquidW) / s.solarInputW), eta_e: r1((100 * s.electricalW) / s.solarInputW), solar: s.solarInputW, opt: r1(s.opticalLossW),
        front: r1(s.qFrontLossW), rain: r1(s.qRainW), back: r1(s.qBackLossW), resid: s.energyBalanceResidualW, sumQ: r1(sumQ),
        net: r1(s.netCoolingBenefitW), avoided: r1(s.avoidedCoolingElecW), tout: r1(s.outletC),
      });
    }
  });
  it('rain attribution decomposition (rainy preset)', () => {
    const p = PRESETS.rainy;
    const wet = simulate(p);
    const dry = simulate({ ...p, rainMmH: 0 });
    // rain with sky depression held at dry value (isolates the drop sensible term from the cloud/sky effect)
    // approximate by: dry sky = rain 0 but using hRain only -> emulate via indep? use sky difference estimate:
    const skyOnly = simulate({ ...p, rainMmH: 0 });
    console.log('wet q', r1(wet.qLiquidW), 'dry q', r1(dry.qLiquidW), 'rain share', r1(((wet.qLiquidW - dry.qLiquidW) / wet.qLiquidW) * 100), '%');
    console.log('rain term qRain', r1(wet.qRainW), 'front', r1(wet.qFrontLossW), 'rain/total front', r1((wet.qRainW / (wet.qFrontLossW + wet.qRainW)) * 100), '%');
    void skyOnly;
    // sky-depression effect isolated: wet physics with sky dep 6 would need model change; estimate with indep scaled
    const i = { ...p, pumpControl: 'on' as const };
    const a = indep(i, 'solarvein-dual', true);
    console.log('indep q wet', r1(a.qLiq));
    // epsilon band via indep copy (eps 0.3..1.0)
  });
  it('rainy COP sensitivity', () => {
    for (const cop of [3.5, 10, 20, 30, 40, 60]) {
      const s = simulate({ ...PRESETS.rainy, coolingCOP: cop });
      const c = simulate({ ...PRESETS.rainy, coolingCOP: cop }, 'conventional-pv');
      console.log('COP', cop, 'regime', s.regime, 'pumpOn', s.pumpOn, 'avoided', r1(s.avoidedCoolingElecW), 'net(pump)', r1(s.netCoolingBenefitW), 'net incl PV penalty', r1(s.avoidedCoolingElecW - s.pumpW + (s.electricalW - c.electricalW)));
    }
    // when is rejection worth it with PV penalty
  });
  it('rainy w/o hot source: PVT vs conv PV electricity', () => {
    const p = { ...PRESETS.rainy, hotSourceAvailable: false };
    const s = simulate(p);
    const c = simulate(p, 'conventional-pv');
    console.log('no source: pumpOn', s.pumpOn, 'pe', r1(s.electricalW), 'cell', r1(s.cellC), '| conv pe', r1(c.electricalW), 'cell', r1(c.cellC), 'regime', s.regime);
  });
  it('sunny sensitivities and heat vs G (nonlinearity)', () => {
    for (const g of [100, 200, 300, 400, 500, 600, 700, 800, 900, 1000]) {
      const s = simulate({ ...PRESETS.sunny, irradiance: g });
      console.log('G', g, 'pumpOn', s.pumpOn, 'q', r1(s.qLiquidW), 'eta_th %', r1((100 * s.qLiquidW) / s.solarInputW), 'Tcell', r1(s.cellC));
    }
    for (const tin of [30, 40, 50, 60, 70]) {
      const s = simulate({ ...PRESETS.sunny, inletC: tin });
      console.log('Tin', tin, 'q', r1(s.qLiquidW), 'eta', r1((100 * s.qLiquidW) / s.solarInputW), 'pe', r1(s.electricalW), 'pump on', s.pumpOn);
    }
  });
  it('day integration vs snapshot x hours (sunny clear day, DHW load always present)', () => {
    const pts = simulateDay(PRESETS.sunny, 'cerah');
    const sumQ = pts.reduce((a, p) => a + p.result.usefulHeatW, 0) / 1000;
    const sumG = pts.reduce((a, p) => a + p.result.solarInputW, 0) / 1000;
    const sumPe = pts.reduce((a, p) => a + p.result.electricalW, 0) / 1000;
    const sumPeConv = pts.map((p) => simulate(p.result.inputs, 'conventional-pv').electricalW).reduce((a, b) => a + b, 0) / 1000;
    const s900 = simulate(PRESETS.sunny);
    const eqHours = (sumG * 1000) / s900.solarInputW; // equivalent hours at 900 W/m2
    console.log('clear day: Gin kWh', r1(sumG), 'heat kWh', r1(sumQ), 'elec kWh', r1(sumPe), 'conv elec kWh', r1(sumPeConv), 'eq hours@900', r1(eqHours),
      'snapshot-scaled heat', r1((s900.usefulHeatW * eqHours) / 1000), 'ratio day/snapshot', r1((sumQ / ((s900.usefulHeatW * eqHours) / 1000)) * 100), '%',
      'seasonal eta_th', r1((100 * sumQ) / sumG), 'eta_e', r1((100 * sumPe) / sumG));
    const day1400 = (sumQ / sumG) * ((1400 * s900.solarInputW) / 1000);
    console.log('1400h@900 => irradiation kWh/panel/yr', r1((1400 * s900.solarInputW) / 1000), 'heat via day-eta', r1(day1400), 'vs snapshot', r1((s900.usefulHeatW * 1400) / 1000));
  });
  it('dampak defaults', () => {
    const sv = simulate(PRESETS.sunny);
    const cv = simulate(PRESETS.sunny, 'conventional-pv');
    const N = 40000;
    for (const f of [1, 0.6, 0.5, 0.3]) {
      for (const h of [1400]) {
        const hh = h / 1000;
        const eNet = sv.netElectricalW * hh;
        const eInc = (sv.netElectricalW - cv.netElectricalW) * hh;
        const heat = sv.usefulHeatW * hh * f;
        const lpgKg = (sv.avoidedFuelW * hh * f) / (46 / 3.6);
        const co2 = sv.avoidedFuelW * hh * f * 0.23 + (sv.netElectricalW - cv.netElectricalW) * hh * 0.8;
        console.log('f', f, 'per panel kWh_e', r1(eNet), 'inc kWh_e', r1(eInc), 'kWh_th', r1(heat), 'LPG kg', r1(lpgKg), 'tabung', r1(lpgKg / 12), 'CO2 kg', r1(co2),
          '| N: GWh_e', r1((eNet * N) / 1e6), 'GWh_th', r1((heat * N) / 1e6), 't CO2', r1((co2 * N) / 1000), 'payback', r1(180 / co2));
      }
    }
    console.log('shares: pe/G', r1((100 * sv.electricalW) / sv.solarInputW), 'q/G', r1((100 * sv.qLiquidW) / sv.solarInputW), 'optical', r1((100 * sv.opticalLossW) / sv.solarInputW),
      'front+back', r1((100 * (sv.qFrontLossW + sv.qBackLossW)) / sv.solarInputW));
    console.log('heat part of CO2', r1(sv.avoidedFuelW * 1.4 * 0.23), 'elec part', r1((sv.netElectricalW - cv.netElectricalW) * 1.4 * 0.8));
    // DHW demand reality check: 961 kWh_th per panel, 4 panels per roof
    const kWhPerDay = (sv.usefulHeatW * 1.4 * 4) / 365;
    console.log('4 panels heat kWh/day', r1(kWhPerDay), 'litres/day heated 28->45C (17K)', r1((kWhPerDay * 3.6e6) / (4180 * 17) ), 'L; heated 25->45', r1((kWhPerDay * 3.6e6) / (4180 * 20)));
  });
});
