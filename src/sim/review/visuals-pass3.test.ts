/**
 * Pass 3 (Agent G): sampling of the weather engine's intermediate frames against simulate().
 * Print table with: AUDIT_PRINT=1 npx vitest run src/sim/review/visuals-pass3.test.ts --disableConsoleIntercept
 */
import { describe, expect, it } from 'vitest';
import { PRESETS, clampInputs, simulate } from '../index';
import { inputsAt, planTransition } from '../../motion/weather';

const SUNNY = clampInputs(PRESETS.sunny);
const RAINY = clampInputs(PRESETS.rainy);
const PRINT = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env?.AUDIT_PRINT === '1';

function sample(from: typeof SUNNY, to: typeof SUNNY, label: string) {
  const plan = planTransition(from, to);
  const rows: string[] = [];
  let worstRes = 0;
  let signChanges = 0;
  let prevSign = 0;
  let maxCell = -Infinity;
  let maxPeGain = -Infinity; // held-pump P_e minus controller-chosen P_e
  let maxNegBenefitFrames = 0;
  const frames = 100;
  for (let k = 0; k <= frames; k++) {
    const p = k / frames;
    const i = inputsAt(plan, p);
    const r = simulate(i);
    const auto = simulate({ ...i, pumpControl: 'auto' });
    worstRes = Math.max(worstRes, Math.abs(r.energyBalanceResidualW));
    for (const v of [r.qLiquidW, r.electricalW, r.cellC, r.outletC]) expect(Number.isFinite(v)).toBe(true);
    const s = Math.sign(Math.abs(r.qLiquidW) < 1e-9 ? 0 : r.qLiquidW);
    if (prevSign !== 0 && s !== 0 && s !== prevSign) signChanges++;
    if (s !== 0) prevSign = s;
    maxCell = Math.max(maxCell, r.cellC);
    maxPeGain = Math.max(maxPeGain, r.netElectricalW - auto.netElectricalW);
    if (r.regime === 'reject' && r.netCoolingBenefitW < 0) maxNegBenefitFrames++;
    // sign consistency
    expect(Math.sign(r.outletC - r.inletC) === Math.sign(r.qLiquidW) || Math.abs(r.qLiquidW) < 1e-6).toBe(true);
    expect(r.massFlowKgS).toBeGreaterThan(0);
    if (PRINT && k % 5 === 0)
      rows.push(
        `${label} p=${p.toFixed(2)} G=${i.irradiance.toFixed(0)} rain=${i.rainMmH.toFixed(1)} Tin=${i.inletC.toFixed(1)} load=${+i.heatLoadAvailable} src=${+i.hotSourceAvailable} pump=${i.pumpControl}/${+r.pumpOn} regime=${r.regime.padEnd(10)} q=${r.qLiquidW.toFixed(0).padStart(5)} Pe=${r.electricalW.toFixed(1)} Tcell=${r.cellC.toFixed(1)} Tin->out=${r.inletC.toFixed(1)}->${r.outletC.toFixed(1)} usefulH=${r.usefulHeatW.toFixed(0)} rej=${r.heatRejectedW.toFixed(0)} net=${r.netCoolingBenefitW.toFixed(1)} | auto: pump=${+auto.pumpOn} regime=${auto.regime} Pe_net=${auto.netElectricalW.toFixed(1)} vs held ${r.netElectricalW.toFixed(1)} adv=${r.advisories.map((a) => a.code).join(',')}`,
      );
  }
  if (PRINT) {
    console.log(`pStar=${plan.pStar.toFixed(3)} dur=${plan.duration.toFixed(2)}s hold=${plan.hold}`);
    console.log(rows.join('\n'));
    console.log(`worstResidual=${worstRes.toExponential(2)} signChanges=${signChanges} maxCell=${maxCell.toFixed(1)} maxHeldNetPeGainVsAuto=${maxPeGain.toFixed(2)} W rejectFramesWithNegBenefit=${maxNegBenefitFrames}`);
  }
  return { plan, worstRes, signChanges, maxPeGain };
}

describe('pass 3: weather transition frames', () => {
  it('Cerah -> Hujan: one sign change, residual ~0, flags flip at the computed crossing', () => {
    const { worstRes, signChanges } = sample(SUNNY, RAINY, 'S>R');
    expect(worstRes).toBeLessThan(0.5);
    expect(signChanges).toBe(1);
  });
  it('Hujan -> Cerah: one sign change, residual ~0', () => {
    const { worstRes, signChanges } = sample(RAINY, SUNNY, 'R>S');
    expect(worstRes).toBeLessThan(0.5);
    expect(signChanges).toBe(1);
  });
});

describe('pass 3: pump hold is conservative, headline numbers', () => {
  it('forcing the pump on across the zero crossing never raises NET electricity above the controller choice', () => {
    for (const [a, b] of [[SUNNY, RAINY], [RAINY, SUNNY]] as const) {
      const plan = planTransition(a, b);
      for (let k = 0; k <= 2000; k++) {
        const i = inputsAt(plan, k / 2000);
        const held = simulate(i);
        const auto = simulate({ ...i, pumpControl: 'auto' });
        expect(held.netElectricalW).toBeLessThanOrEqual(auto.netElectricalW + 1e-6);
      }
    }
  });
  it('rainy net benefit versus conventional PV is avoided cooling - pump - PV penalty (7.8 W), not the sim netCoolingBenefitW (9.8 W)', () => {
    const dual = simulate(RAINY, 'solarvein-dual');
    const conv = simulate(RAINY, 'conventional-pv');
    const vsConv = dual.avoidedCoolingElecW + dual.netElectricalW - conv.netElectricalW; // ledger form: 48.3 - 40.5
    expect(dual.netCoolingBenefitW).toBeCloseTo(9.8, 1);
    expect(vsConv).toBeCloseTo(7.8, 1);
    expect(vsConv).toBeLessThan(dual.netCoolingBenefitW);
  });
  it('default Dampak (f = 0.5): SolarVein net electricity is BELOW plain PV by ~8.5 kWh per panel-year (338 MWh for 40 000 panels)', () => {
    const f = 0.5;
    const h = 1.4;
    const dual = simulate(SUNNY);
    const idle = simulate({ ...SUNNY, heatLoadAvailable: false });
    const conv = simulate(SUNNY, 'conventional-pv');
    const net = (f * dual.netElectricalW + (1 - f) * idle.netElectricalW) * h;
    const diff = net - conv.netElectricalW * h;
    expect(diff).toBeLessThan(0);
    expect(diff * 40000 / 1000).toBeCloseTo(-338, -1); // MWh
    // ledger row "Selisih listrik PV" must therefore be about -4.9 kg CO2e (gross diff x 0.8), not +12.2 kg
    const gross = (f * dual.electricalW + (1 - f) * idle.electricalW - conv.electricalW) * h * 0.8;
    expect(gross).toBeCloseTo(-4.9, 1);
  });
});
