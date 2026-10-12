import { describe, it } from 'vitest';
import { PRESETS } from '../presets';
import { simulate, compareConfigurations, MODEL_CONSTANTS as K } from '../model';
import { simulateDay, summarizeDay } from '../day';
import { computeCarbon, DEFAULT_CARBON } from '../carbon';
import { computeVerdict } from '../../charts/verdict';

const r1 = (x: number) => Math.round(x * 10) / 10;
const J = (o: unknown) => JSON.stringify(o, (_k, v) => (typeof v === 'number' ? Math.round(v * 100) / 100 : v));

const PRINT = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env?.AUDIT_PRINT === '1';

/** Exploratory numbers quoted in docs/audit/03-physics.md. Run: AUDIT_PRINT=1 npx vitest run src/sim/review/audit-numbers.test.ts --disableConsoleIntercept */
describe.skipIf(!PRINT)('audit numbers (print only)', () => {
  it('rainy breakdown', () => {
    const p = PRESETS.rainy;
    const r = simulate(p);
    const A = p.areaM2;
    console.log('RAINY', J({ Tp: r.cellC, stag: r.stagnationC, qLiq: r.qLiquidW, front: r.qFrontLossW, rain: r.qRainW, back: r.qBackLossW, abs: r.absorbedW, pe: r.electricalW, pump: r.pumpW, tout: r.outletC, c: r.coefficients, net: r.netCoolingBenefitW }));
    const conv = simulate(p, 'conventional-pv');
    console.log('RAINY conv Pe', r1(conv.electricalW), 'Tcell', r1(conv.cellC), 'dual Pe', r1(r.electricalW), 'dual net', r1(r.netElectricalW), 'conv net', r1(conv.netElectricalW));
    for (const rain of [0, 2, 5, 10, 15, 30, 60]) {
      const x = simulate({ ...p, rainMmH: rain });
      console.log('rain', rain, 'qLiq', r1(x.qLiquidW), 'rainW', r1(x.qRainW), 'front', r1(x.qFrontLossW), 'Tp', r1(x.cellC), 'regime', x.regime);
    }
    for (const [g, rain, v] of [[0, 0, 3], [0, 0, 0], [0, 0, 1], [120, 0, 3], [0, 15, 3], [0, 15, 0]] as const) {
      const x = simulate({ ...p, irradiance: g, rainMmH: rain, windMs: v });
      console.log('G', g, 'rain', rain, 'v', v, 'qLiq', r1(x.qLiquidW), 'Tp', r1(x.cellC), 'regime', x.regime, 'pumpOn', x.pumpOn);
    }
    console.log('UA_eff W/K', r1(-r.qLiquidW / (p.inletC - p.ambientC)), 'per m2', r1(-r.qLiquidW / (p.inletC - p.ambientC) / A));
    const Tr = p.ambientC - K.rainTempOffsetK;
    const mdotRain = p.rainMmH / 3600;
    console.log('max sensible (eps=1) h_rain', r1(mdotRain * 4180), 'W/m2K ; model', r1(0.7 * mdotRain * 4180), 'Train', Tr);
  });

  it('series glass resistance, glazed variant, rain sensitivity (own solver)', () => {
    const p = PRESETS.rainy;
    const sigma = K.sigma;
    const A = p.areaM2;
    const T0 = 273.15;
    function solve(opts: { Ucg?: number; glazedGap?: boolean; epsRain: number; skyDep: number; rain: number; G: number; wind: number }) {
      const hConv = 2.8 + 3 * opts.wind;
      const hRain = opts.epsRain * (opts.rain / 3600) * 4180;
      const skyK = p.ambientC - opts.skyDep + T0;
      const rainT = p.ambientC - 1.5;
      const mdot = (999 * p.flowLpm) / 60000;
      const mcp = mdot * 4180;
      const ntu = (p.uPlateFluid * A) / mcp;
      const eps = 1 - Math.exp(-ntu);
      const abs = 0.88 * opts.G * A;
      const front = (Ts: number) => A * (hConv * (Ts - p.ambientC) + 0.9 * sigma * ((Ts + T0) ** 4 - skyK ** 4) + hRain * (Ts - rainT));
      const link = (Tp: number) => {
        let lo = -50;
        let hi = Tp + 1;
        for (let i = 0; i < 100; i++) {
          const Ts = 0.5 * (lo + hi);
          let qIn: number;
          if (opts.glazedGap) {
            const hr = 0.82 * 4 * sigma * (0.5 * (Tp + Ts) + T0) ** 3;
            qIn = A * (3 + hr) * (Tp - Ts);
          } else {
            qIn = A * (opts.Ucg ?? 1e9) * (Tp - Ts);
          }
          if (qIn > front(Ts)) lo = Ts;
          else hi = Ts;
        }
        const Ts = 0.5 * (lo + hi);
        return { Ts, q: front(Ts) };
      };
      let lo = -60;
      let hi = 300;
      for (let i = 0; i < 100; i++) {
        const Tp = 0.5 * (lo + hi);
        const pe = Math.max(0, 0.2 * (1 - 0.0035 * (Tp - 25))) * opts.G * A;
        const back = A * 1.0 * (Tp - p.ambientC);
        const qL = eps * mcp * (Tp - p.inletC);
        const f = abs - pe - link(Tp).q - back - qL;
        if (f > 0) lo = Tp;
        else hi = Tp;
      }
      const Tp = 0.5 * (lo + hi);
      const L = link(Tp);
      return { Tp: r1(Tp), Ts: r1(L.Ts), qLiq: r1(eps * mcp * (Tp - p.inletC)), front: r1(L.q) };
    }
    const base = { epsRain: 0.7, skyDep: 1, rain: 15, G: 120, wind: 3 };
    console.log('model-equivalent (no glass link)', J(solve({ ...base })));
    console.log('with Ucg=200 series', J(solve({ ...base, Ucg: 200 })));
    console.log('glazed w/ air gap, rain', J(solve({ ...base, glazedGap: true })));
    console.log('glazed w/ air gap, no rain (sky 6)', J(solve({ ...base, glazedGap: true, rain: 0, skyDep: 6 })));
    console.log('glazed w/ air gap, no rain, sky 1', J(solve({ ...base, glazedGap: true, rain: 0, skyDep: 1 })));
    console.log('unglazed, no rain, sky 6', J(solve({ ...base, rain: 0, skyDep: 6 })));
    console.log('unglazed, no rain, sky 1', J(solve({ ...base, rain: 0, skyDep: 1 })));
    console.log('unglazed eps_rain 0.3', J(solve({ ...base, epsRain: 0.3 })));
    console.log('unglazed eps_rain 1.0', J(solve({ ...base, epsRain: 1.0 })));
    console.log('unglazed eps_rain 0.0', J(solve({ ...base, epsRain: 0.0 })));
    console.log('night clear sky 12K no rain unglazed', J(solve({ ...base, G: 0, rain: 0, skyDep: 12 })));
    console.log('night overcast 1K no rain unglazed', J(solve({ ...base, G: 0, rain: 0, skyDep: 1 })));
    console.log('Ucg=200 + eps_rain 0.4', J(solve({ ...base, Ucg: 200, epsRain: 0.4 })));
  });

  it('evaporation potential of a wet surface', () => {
    const Ts = 40.2;
    const Ta = 25;
    const RH = 0.95;
    const v = 3;
    const psat = (T: number) => 610.94 * Math.exp((17.625 * T) / (T + 243.04));
    const Rv = 461.5;
    const rhoS = psat(Ts) / (Rv * (Ts + 273.15));
    const rhoA = (RH * psat(Ta)) / (Rv * (Ta + 273.15));
    const hc = 2.8 + 3 * v;
    const Le = 0.85;
    const hm = hc / (1.17 * 1007 * Math.pow(Le, 2 / 3));
    const evap = hm * (rhoS - rhoA) * 2.4e6;
    console.log('evap potential W/m2 (surface wet at Ts)', Math.round(evap), 'psat s/a kPa', r1(psat(Ts) / 1000), r1((RH * psat(Ta)) / 1000));
  });

  it('sunny sensitivity to T_in (DHW tank warms)', () => {
    const p = PRESETS.sunny;
    for (const tin of [30, 40, 50, 60, 70]) {
      const c = compareConfigurations({ ...p, inletC: tin });
      const d = c['solarvein-dual'];
      const cv = c['conventional-pv'];
      console.log('Tin', tin, 'Qliq', r1(d.qLiquidW), 'eta_th%', r1((100 * d.qLiquidW) / d.solarInputW), 'Tout', r1(d.outletC), 'Tcell', r1(d.cellC), 'Pe', r1(d.electricalW), 'convPe', r1(cv.electricalW), 'convT', r1(cv.cellC), 'pumpOn', d.pumpOn, 'verdict', computeVerdict(c).kind);
    }
  });

  it('stagnation extremes', () => {
    const p = { ...PRESETS.sunny, irradiance: 1200, ambientC: 45, windMs: 0, pumpControl: 'off' as const };
    const d = simulate(p);
    const c = simulate(p, 'conventional-pv');
    console.log('stag G1200 Ta45 v0 insulated', r1(d.cellC), 'Pe', r1(d.electricalW), 'eta%', r1(100 * d.etaElectrical), 'conv', r1(c.cellC), r1(c.electricalW), d.advisories.map((a) => a.code).join(','));
    const h2 = simulate({ ...PRESETS.sunny, inletC: 80, irradiance: 1200, flowLpm: 0.3 });
    console.log('Tin80 flow0.3 G1200 sunny', 'Tout', r1(h2.outletC), 'Tcell', r1(h2.cellC), h2.regime, r1(h2.qLiquidW));
  });

  it('chiller vs dry cooler baseline and carbon', () => {
    const p = PRESETS.rainy;
    for (const cop of [3.5, 6, 10, 20, 30, 50]) {
      const r = simulate({ ...p, coolingCOP: cop } as typeof p);
      console.log('COP', cop, 'avoided', r1(r.avoidedCoolingElecW), 'pump', r1(r.pumpW), 'net', r1(r.netCoolingBenefitW), 'pumpOn', r.pumpOn, r.regime);
    }
    const r = simulate(p);
    console.log('carbon rainy cooling on', J(computeCarbon(r, { ...DEFAULT_CARBON, coolingDisplacementModeled: true })));
    console.log('carbon rainy default', J(computeCarbon(r, DEFAULT_CARBON)));
    const s = simulate(PRESETS.sunny);
    const cv = simulate(PRESETS.sunny, 'conventional-pv');
    console.log('carbon sunny', J(computeCarbon(s, DEFAULT_CARBON)));
    const h = 1.4;
    const incrElec = (s.electricalW - s.pumpW - cv.electricalW) * h * 0.8;
    const heat = s.avoidedFuelW * h * 0.23;
    console.log('incremental vs conventional kg/yr: elec', r1(incrElec), 'heat', r1(heat), 'sum', r1(incrElec + heat), 'payback yrs on 450kg incremental?', r1(450 / (incrElec + heat)));
    const ce = computeCarbon(s, DEFAULT_CARBON);
    console.log('tool payback', r1(ce.carbonPaybackYears), 'gross elec credit', r1(ce.electricityKgPerYear));
    console.log('PV module alone embodied ~200 kg -> conv PV payback yrs', r1(200 / (cv.electricalW * h * 0.8)));
  });

  it('arrows: |q|>20 W but regime negligible', () => {
    const cases = [
      { n: 'sunny forced on, no heat load', c: { ...PRESETS.sunny, pumpControl: 'on' as const, heatLoadAvailable: false } },
      { n: 'sunny forced on, Tin 60 no source', c: { ...PRESETS.sunny, pumpControl: 'on' as const, inletC: 60 } },
      { n: 'rainy forced on, no hot source', c: { ...PRESETS.rainy, pumpControl: 'on' as const, hotSourceAvailable: false } },
    ];
    for (const { n, c } of cases) {
      const r = simulate(c);
      console.log(n, 'q', r1(r.qLiquidW), 'regime', r.regime, 'pumpOn', r.pumpOn);
    }
  });

  it('day totals', () => {
    for (const sc of ['cerah', 'hujan'] as const) {
      const base = sc === 'hujan' ? PRESETS.rainy : PRESETS.sunny;
      const pts = simulateDay(base, sc);
      console.log('day', sc, J(summarizeDay(pts)));
      console.log(pts.map((p) => `${p.hour}:${r1(p.result.qLiquidW)}${p.rainMmH ? 'R' : ''}`).join(' '));
    }
  });

  it('verdict grid', () => {
    const counts: Record<string, number> = {};
    let n = 0;
    for (const g of [100, 300, 600, 900])
      for (const tin of [20, 30, 45, 60])
        for (const rain of [0, 15])
          for (const hl of [true, false])
            for (const hs of [true, false]) {
              const c = compareConfigurations({ ...PRESETS.sunny, irradiance: g, inletC: tin, rainMmH: rain, heatLoadAvailable: hl, hotSourceAvailable: hs });
              const v = computeVerdict(c).kind;
              counts[v] = (counts[v] ?? 0) + 1;
              n++;
            }
    console.log('verdict counts', n, JSON.stringify(counts));
    const rainyV = computeVerdict(compareConfigurations(PRESETS.rainy));
    console.log('rainy verdict', rainyV.kind, rainyV.headline);
  });
});
