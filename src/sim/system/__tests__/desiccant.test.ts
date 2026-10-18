import { describe, expect, it } from 'vitest';
import type { CarbonParams, ClimatePoint, DesiccantEvalInput, DesiccantParams, HotelParams } from '../contract';
import {
  copRatioSensitivity,
  desiccantSweep,
  equilibriumRh,
  evaluateDesiccant,
  heatOfAdsorptionKJkg,
  isothermUptake,
  W_MAX,
} from '../desiccant';
import { enthalpyKJkg, humidityRatio } from '../psychro';

// ── Fixtures (self-contained: DEFAULT_SYSTEM belongs to W2a) ──
const ambient = (tC: number, rh: number): ClimatePoint => ({
  irradiance: 800,
  ambientC: tC,
  rh,
  humidityRatio: humidityRatio(tC, rh),
  windMs: 1,
  rainMmH: 0,
});
const HOTEL = { freshAirKgS: 0.5, supplyDewPointC: 11 } as HotelParams;
const CARBON = { coilRefCop: 3.0, aftercoolerCop: 6.0 } as CarbonParams;
const PARAMS: DesiccantParams = {
  enabled: true,
  material: 'silica-rd',
  bedMassKg: 40,
  cycleMin: 10,
  cycleEffectiveness: 0.45,
  regenAir: 'ambient',
  pressureDropPa: 250,
  fanEfficiency: 0.6,
  regenAirKgS: 0.5,
};
function input(over: Partial<DesiccantEvalInput> = {}, amb = ambient(30, 0.75)): DesiccantEvalInput {
  return {
    regenC: 50,
    process: { tC: amb.ambientC, humidityRatio: amb.humidityRatio },
    regenAir: 'ambient',
    ambient: amb,
    params: PARAMS,
    hotel: HOTEL,
    carbon: CARBON,
    ...over,
  };
}
const withAir = (regenAir: 'ambient' | 'exhaust', over: Partial<DesiccantEvalInput> = {}) =>
  input({ regenAir, params: { ...PARAMS, regenAir }, ...over });

describe('isotherm (RD silica gel, Pesaran & Mills 1987 + Clausius-Clapeyron shift)', () => {
  it('is monotone increasing in RH, decreasing in T, bounded [0, W_MAX]', () => {
    for (const t of [25, 35, 45, 55, 70, 85]) {
      let prev = -1;
      for (let rh = 0; rh <= 1.0001; rh += 0.02) {
        const q = isothermUptake('silica-rd', rh, t);
        expect(q).toBeGreaterThanOrEqual(prev - 1e-9);
        expect(q).toBeGreaterThanOrEqual(0);
        expect(q).toBeLessThanOrEqual(W_MAX + 1e-12);
        prev = q;
      }
    }
    for (const rh of [0.05, 0.1, 0.2, 0.4, 0.6, 0.8, 0.95]) {
      let prev = Infinity;
      for (let t = 20; t <= 90; t += 5) {
        const q = isothermUptake('silica-rd', rh, t);
        expect(q).toBeLessThanOrEqual(prev + 1e-9);
        prev = q;
      }
    }
  });

  it('gives plausible RD-gel capacities at 25 C (datasheet ballpark: >0,27 at 50 %, >0,36 at 80 %)', () => {
    expect(isothermUptake('silica-rd', 0.5, 25)).toBeGreaterThan(0.27);
    expect(isothermUptake('silica-rd', 0.5, 25)).toBeLessThan(0.34);
    expect(isothermUptake('silica-rd', 0.8, 25)).toBeGreaterThan(0.34);
    expect(isothermUptake('silica-rd', 0.8, 25)).toBeLessThan(0.4);
    expect(isothermUptake('silica-rd', 0.1, 25)).toBeGreaterThan(0.04);
  });

  it('inverse is consistent and the heat of adsorption is continuous at W = 0,05', () => {
    for (const t of [25, 45, 65]) {
      for (const q of [0.02, 0.1, 0.2, 0.3]) {
        expect(isothermUptake('silica-rd', equilibriumRh(q, t), t)).toBeCloseTo(q, 4);
      }
    }
    expect(Math.abs(heatOfAdsorptionKJkg(0.05 - 1e-9) - heatOfAdsorptionKJkg(0.05 + 1e-9))).toBeLessThan(1);
    expect(heatOfAdsorptionKJkg(0.2)).toBeGreaterThan(2442); // exceeds latent heat: heat of wetting
  });
});

describe('desiccant evaluation', () => {
  it('swing ~ 0 at regenC = 35 C with ambient regeneration air (30 C / 75 %): useless, verdict tidak-layak', () => {
    const e = evaluateDesiccant(input({ regenC: 35 }));
    expect(e.swing).toBeLessThan(0.05);
    expect(e.coverage).toBeLessThan(0.05);
    expect(e.verdict).toBe('tidak-layak');
    expect(e.hvac.netSavingWe).toBeLessThanOrEqual(0);
  });

  it('process air leaves hotter (adsorption heat), never colder; dT >= latent/cp for the water removed', () => {
    const e = evaluateDesiccant(input({ regenC: 55 }));
    const wP = ambient(30, 0.75).humidityRatio;
    const dw = wP - e.processOut.humidityRatio;
    expect(dw).toBeGreaterThan(0.002);
    expect(e.processDeltaTK).toBeGreaterThanOrEqual(2300 * dw); // isenthalpic floor ~ 2501/1,03 K per kg/kg
    expect(enthalpyKJkg(e.processOut.tC, e.processOut.humidityRatio)).toBeGreaterThanOrEqual(
      enthalpyKJkg(30, wP) - 1e-9,
    );
    // plan: 3-4 g/kg removed => +8-12 K, i.e. ~2-4 K per g/kg.
    expect(e.processDeltaTK / (dw * 1000)).toBeGreaterThan(2);
    expect(e.processDeltaTK / (dw * 1000)).toBeLessThan(4.5);
  });

  it('mass balance: water out of the process air = water into the regeneration air (+-1 %)', () => {
    for (const ra of ['ambient', 'exhaust'] as const) {
      for (const t of [40, 50, 60, 70]) {
        const i = withAir(ra, { regenC: t });
        const e = evaluateDesiccant(i);
        const out = (i.ambient.humidityRatio - e.processOut.humidityRatio) * 0.5 * 3600;
        const into = (e.regenOut.humidityRatio - e.regenIn.humidityRatio) * PARAMS.regenAirKgS * 3600;
        expect(e.moistureRemovedKgH).toBeGreaterThan(0);
        expect(Math.abs(out - e.moistureRemovedKgH)).toBeLessThanOrEqual(0.01 * e.moistureRemovedKgH);
        expect(Math.abs(into - e.moistureRemovedKgH)).toBeLessThanOrEqual(0.01 * e.moistureRemovedKgH);
      }
    }
  });

  it('regeneration exhaust is wetter than the inlet, stays below saturation, and is cooler than the hot inlet', () => {
    for (const ra of ['ambient', 'exhaust'] as const) {
      for (const t of [35, 45, 55, 70]) {
        const e = evaluateDesiccant(withAir(ra, { regenC: t }));
        expect(e.regenOut.humidityRatio).toBeGreaterThanOrEqual(e.regenIn.humidityRatio);
        expect(e.regenOut.rh).toBeLessThanOrEqual(0.95 + 1e-9);
        expect(e.regenOut.tC).toBeLessThanOrEqual(Math.max(t, e.regenIn.tC) + 1e-9);
      }
    }
  });

  it('process dw never exceeds the equilibrium limit of the regenerated bed, and never over-dries', () => {
    for (const t of [40, 50, 60, 70]) {
      const e = evaluateDesiccant(input({ regenC: t }));
      const wP = ambient(30, 0.75).humidityRatio;
      expect(wP - e.processOut.humidityRatio).toBeLessThanOrEqual(wP - e.equilibriumHumidityRatio + 1e-9);
      expect(e.processOut.humidityRatio).toBeGreaterThanOrEqual(e.supply.humidityRatio - 1e-9);
    }
  });

  it('enabled = false gives zeros', () => {
    const e = evaluateDesiccant(input({ params: { ...PARAMS, enabled: false } }));
    expect(e.moistureRemovedKgH).toBe(0);
    expect(e.regenHeatW).toBe(0);
    expect(e.latentRemovedW).toBe(0);
    expect(e.hvac.netSavingWe).toBe(0);
    expect(e.hvac.aftercoolerWe).toBe(0);
    expect(e.hvac.fanWe).toBe(0);
    expect(e.verdict).toBe('tidak-layak');
  });

  it('no NaN or Infinity over regenC 30-80 C x RH 40-95 %, both sources, both materials', () => {
    let count = 0;
    for (const rh of [0.4, 0.55, 0.7, 0.8, 0.95]) {
      for (let t = 30; t <= 80; t += 5) {
        for (const ra of ['ambient', 'exhaust'] as const) {
          for (const material of ['silica-rd', 'komposit-hipotesis'] as const) {
            const amb = ambient(30, rh);
            const e = evaluateDesiccant(
              input({ regenC: t, regenAir: ra, params: { ...PARAMS, regenAir: ra, material } }, amb),
            );
            const nums = [
              e.regenAirRh, e.uptakeProcess, e.uptakeRegen, e.swing, e.effectiveSwing, e.moistureRemovedKgH,
              e.processOut.tC, e.processOut.humidityRatio, e.latentRemovedW, e.regenHeatW, e.thermalCop,
              e.hvac.coilRefWe, e.hvac.aftercoolerWe, e.hvac.fanWe, e.hvac.netSavingWe,
              e.perKgWater.desiccantKWhE, e.perKgWater.coilRefKWhE, e.autonomyH, e.regenOut.tC, e.regenOut.rh,
              e.savedKWhEPerKWhTh,
            ];
            for (const x of nums) expect(Number.isFinite(x)).toBe(true);
            count++;
          }
        }
      }
    }
    expect(count).toBe(220);
  });

  it('degenerate inputs stay finite (dry ambient, zero airflow, zero bed)', () => {
    const dry = ambient(25, 0.3);
    for (const e of [
      evaluateDesiccant(input({}, dry)),
      evaluateDesiccant(input({ params: { ...PARAMS, processAirKgS: 0 } })),
      evaluateDesiccant(input({ params: { ...PARAMS, bedMassKg: 0 } })),
    ]) {
      expect(Number.isFinite(e.hvac.netSavingWe)).toBe(true);
      expect(Number.isFinite(e.perKgWater.desiccantKWhE)).toBe(true);
      expect(e.verdict).toBe('tidak-layak');
    }
  });

  it('exhaust-air regeneration gives >= the swing and >= the moisture removal of ambient air at the same regenC', () => {
    for (let t = 35; t <= 70; t += 5) {
      const a = evaluateDesiccant(withAir('ambient', { regenC: t }));
      const x = evaluateDesiccant(withAir('exhaust', { regenC: t }));
      expect(x.swing).toBeGreaterThanOrEqual(a.swing - 1e-12);
      expect(x.moistureRemovedKgH).toBeGreaterThanOrEqual(a.moistureRemovedKgH - 1e-9);
      expect(x.regenAirRh).toBeLessThanOrEqual(a.regenAirRh);
    }
  });

  it('removal grows with regenC (ambient air) from 35 to 70 C', () => {
    const rows = desiccantSweep(input(), [35, 40, 45, 50, 55, 60, 65, 70]);
    expect(rows.map((r) => r.regenC)).toEqual([35, 40, 45, 50, 55, 60, 65, 70]);
    for (let k = 1; k < rows.length; k++) {
      const cur = rows[k]!;
      const prev = rows[k - 1]!;
      expect(cur.moistureRemovedKgH).toBeGreaterThanOrEqual(prev.moistureRemovedKgH - 1e-9);
      expect(cur.swing).toBeGreaterThanOrEqual(prev.swing - 1e-12);
    }
  });

  it('electricity accounting: PV penalty and pump subtract 1:1; fans use both streams', () => {
    const base = evaluateDesiccant(input({ regenC: 55 }));
    const more = evaluateDesiccant(input({ regenC: 55, pumpWe: 120, pvPenaltyWe: 380 }));
    expect(more.hvac.netSavingWe).toBeCloseTo(base.hvac.netSavingWe - 500, 6);
    expect(base.hvac.fanWe).toBeCloseTo((((0.5 + 0.5) / 1.15) * 250) / 0.6, 6);
    // duty bookkeeping: after-cooler + residual duty >= reference duty (adsorption heat is extra enthalpy)
    expect(base.dutyW.aftercooler + base.dutyW.residualCoil).toBeGreaterThanOrEqual(base.dutyW.coilRef * 0.999);
  });

  it('per-kg figures share one basis (the REQUIRED moisture removal) and agree with the net saving', () => {
    const e = evaluateDesiccant(input({ regenC: 55 }));
    const need = e.requiredMoistureKgH;
    expect(need).toBeGreaterThan(e.moistureRemovedKgH);
    expect(e.perKgWater.coilRefKWhE).toBeCloseTo(e.hvac.coilRefWe / 1000 / need, 8);
    expect(e.perKgWater.coilRefKWhE - e.perKgWater.desiccantKWhE).toBeCloseTo(e.hvac.netSavingWe / 1000 / need, 8);
    // physically meaningful magnitude for a dehumidifying coil: a few tenths of a kWh_e per kg of water
    expect(e.perKgWater.coilRefKWhE).toBeGreaterThan(0.1);
    expect(e.perKgWater.coilRefKWhE).toBeLessThan(0.8);
  });

  it('nearBreakEven: true only while operating with |net| < 2 % of the coil electricity', () => {
    expect(evaluateDesiccant(input({ regenC: 35 })).nearBreakEven).toBe(false); // not operating
    // tune the COP ratio to the break-even point of one case
    const base = input({ regenC: 55 });
    const r = evaluateDesiccant(base).breakEvenCopRatio!;
    const at = (x: number) =>
      evaluateDesiccant({ ...base, carbon: { ...CARBON, aftercoolerCop: x * CARBON.coilRefCop } as CarbonParams });
    expect(at(r).nearBreakEven).toBe(true);
    expect(at(r * 1.5).nearBreakEven).toBe(false);
    expect(at(r * 0.7).nearBreakEven).toBe(false);
  });

  it('autonomy = dry bed capacity / removal rate', () => {
    const e = evaluateDesiccant(input({ regenC: 55 }));
    expect(e.autonomyH).toBeCloseTo((PARAMS.bedMassKg * e.effectiveSwing) / e.moistureRemovedKgH, 8);
  });

  it('thermal COP = latent / regeneration heat, and the heat breakdown fits inside the delivered heat', () => {
    const e = evaluateDesiccant(input({ regenC: 55 }));
    expect(e.thermalCop).toBeCloseTo(e.latentRemovedW / e.regenHeatW, 8);
    expect(e.latentRemovedW).toBeGreaterThan(0);
    const b = e.regenHeatBreakdownW;
    expect(b.desorption + b.bedSensible + b.exhaustLoss).toBeLessThanOrEqual(e.regenHeatW + 1e-6);
  });

  it('composite material is labelled hypothesis and can never be "layak"', () => {
    const c = evaluateDesiccant(
      withAir('exhaust', { regenC: 65, params: { ...PARAMS, regenAir: 'exhaust', material: 'komposit-hipotesis' } }),
    );
    expect(c.tag).toBe('hipotesis');
    expect(c.verdict).not.toBe('layak');
    expect(c.notes.join(' ')).toMatch(/Komposit/);
    expect(evaluateDesiccant(input()).tag).toBe('simulasi');
  });

  it('verdict rules: tidak-layak when net <= 0, marginal for a small share or low thermal COP, layak otherwise', () => {
    for (const r of desiccantSweep(withAir('exhaust'), [35, 45, 55, 65, 70])) {
      const share = r.hvac.netSavingWe / r.hvac.coilRefWe;
      if (r.hvac.netSavingWe <= 0) expect(r.verdict).toBe('tidak-layak');
      else if (share < 0.15 || r.thermalCop < 0.3) expect(r.verdict).toBe('marginal');
      else expect(r.verdict).toBe('layak');
    }
    expect(evaluateDesiccant(withAir('exhaust', { regenC: 60, pvPenaltyWe: 5000 })).verdict).toBe('tidak-layak');
  });
});

describe('compressor vs desiccant (REGRESSION - human review if it changes)', () => {
  it('physics invariant: with NO high-temperature COP advantage the compressor route is never worse (35-70 C, both air sources)', () => {
    const carbon = { ...CARBON, aftercoolerCop: CARBON.coilRefCop } as CarbonParams;
    for (const ra of ['ambient', 'exhaust'] as const) {
      for (let t = 35; t <= 70; t += 5) {
        const e = evaluateDesiccant(withAir(ra, { regenC: t, carbon }));
        // adsorption heat and the hot bed add enthalpy the after-cooler must remove again; fans add power.
        expect(e.perKgWater.desiccantKWhE).toBeGreaterThanOrEqual(e.perKgWater.coilRefKWhE);
      }
    }
  });

  it('at 35 C with ambient regeneration air the compressor wins outright (default COPs 3,0 / 6,0)', () => {
    const e = evaluateDesiccant(input({ regenC: 35 }));
    expect(e.perKgWater.desiccantKWhE).toBeGreaterThanOrEqual(e.perKgWater.coilRefKWhE);
  });

  it('FLAG: at 45-55 C the desiccant route only beats the compressor if the after-cooler COP is above a break-even multiple of the coil COP', () => {
    // The council expected desiccant >= compressor electricity for 35-55 C. With COP_ref 3,0 / COP_aftercooler 6,0,
    // 250 Pa per stream and zero PV penalty the model says the desiccant route CAN be cheaper in kWh_e at 40-55 C.
    // This test records the break-even so a change in either direction forces a human review; it does not hide it.
    for (const t of [45, 50, 55]) {
      let lo = 3;
      let hi = 12;
      for (let k = 0; k < 40; k++) {
        const mid = (lo + hi) / 2;
        const carbon = { ...CARBON, aftercoolerCop: mid } as CarbonParams;
        if (evaluateDesiccant(input({ regenC: t, carbon })).hvac.netSavingWe > 0) hi = mid;
        else lo = mid;
      }
      expect(hi / CARBON.coilRefCop).toBeGreaterThan(1.2);
      expect(hi / CARBON.coilRefCop).toBeLessThan(1.7);
    }
  });
});

describe('operating flag, break-even COP ratio, sensitivity', () => {
  it('a bed that does (almost) nothing is not operating: net 0, no fan penalty, tidak-layak, with a note', () => {
    const e = evaluateDesiccant(input({ regenC: 35 }));
    expect(e.operating).toBe(false);
    expect(e.hvac.netSavingWe).toBe(0);
    expect(e.hvac.fanWe).toBe(0);
    expect(e.verdict).toBe('tidak-layak');
    expect(e.notes.join(' ')).toMatch(/Tidak beroperasi/);
    expect(e.breakEvenCopRatio).toBeNull();
  });

  it('keeps the honest negative when it operates but loses (heavy PV penalty)', () => {
    const e = evaluateDesiccant(input({ regenC: 60, pvPenaltyWe: 6000 }));
    expect(e.operating).toBe(true);
    expect(e.hvac.netSavingWe).toBeLessThan(0);
    expect(e.verdict).toBe('tidak-layak');
  });

  it('break-even ratio is a true root: net ~ 0 there, > 0 above, < 0 below', () => {
    for (const regenC of [45, 55, 65]) {
      for (const regenAir of ['ambient', 'exhaust'] as const) {
        const base = withAir(regenAir, { regenC });
        const e = evaluateDesiccant(base);
        expect(e.operating).toBe(true);
        const r = e.breakEvenCopRatio;
        expect(r).not.toBeNull();
        const at = (x: number) => copRatioSensitivity(base, [x])[0]!.netSavingWe;
        expect(Math.abs(at(r!))).toBeLessThan(1); // W_e
        expect(at(r! * 1.05)).toBeGreaterThan(0);
        expect(at(r! * 0.95)).toBeLessThan(0);
      }
    }
  });

  it('no COP advantage => break-even above 1; null when not operating', () => {
    expect(evaluateDesiccant(input({ regenC: 55 })).breakEvenCopRatio).toBeGreaterThan(1);
    expect(evaluateDesiccant(input({ regenC: 35 })).breakEvenCopRatio).toBeNull();
    expect(evaluateDesiccant(input({ regenC: 55, pvPenaltyWe: 9000 })).breakEvenCopRatio).toBeNull();
  });

  it('net saving is monotone increasing in the COP ratio', () => {
    const rows = copRatioSensitivity(input({ regenC: 55 }), [1, 1.3, 1.5, 2, 3]);
    for (let k = 1; k < rows.length; k++) expect(rows[k]!.netSavingWe).toBeGreaterThan(rows[k - 1]!.netSavingWe);
  });
});
