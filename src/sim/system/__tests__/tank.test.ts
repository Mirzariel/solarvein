import { describe, expect, it } from 'vitest';
import type { TankParams, TankState } from '../contract';
import {
  RETURN_APPROACH_K,
  initialTank,
  stepTank,
  stepTankDetailed,
  tankEnergyKWhTh,
  tankHeadroomW,
  tankUaWPerK,
} from '../tank';

const MAINS = 28;
const AMB = 28;

function params(volumeL: number, u = 0.5, init: [number, number] = [45, 35]): TankParams {
  return { volumeL, uaWPerK: tankUaWPerK(volumeL, u), maxC: 85, initialTopC: init[0], initialBottomC: init[1] };
}

describe('tank first law', () => {
  it('closes over 24 h with arbitrary charge and discharge (|err| < 0,5 % of throughput)', () => {
    const p = params(3000);
    for (const dt of [0.25, 0.1]) {
      let s = initialTank(p, MAINS);
      const e0 = tankEnergyKWhTh(s, p, MAINS);
      let acc = 0;
      let del = 0;
      let loss = 0;
      const n = Math.round(24 / dt);
      for (let i = 0; i < n; i++) {
        const h = i * dt;
        const chargeW = Math.max(0, 40_000 * Math.sin(((h - 6) / 12) * Math.PI)) * (h > 6 && h < 18 ? 1 : 0);
        const dischargeW = 15_000 * (0.5 + 0.5 * Math.sin(h * 1.7)) * (h % 7 < 3 ? 1 : 0.2);
        const r = stepTankDetailed(
          s,
          p,
          { chargeW, chargeC: 55 + 15 * Math.sin(h / 3), dischargeW, mainsC: MAINS, ambientC: AMB + 3 * Math.sin(h / 4) },
          dt,
        );
        s = r.state;
        acc += (r.acceptedChargeW * dt) / 1000;
        del += (r.deliveredDischargeW * dt) / 1000;
        loss += (r.lossW * dt) / 1000;
        expect(Number.isFinite(s.topC) && Number.isFinite(s.bottomC) && Number.isFinite(s.soc)).toBe(true);
      }
      const dE = tankEnergyKWhTh(s, p, MAINS) - e0;
      const err = Math.abs(dE - (acc - del - loss));
      expect(acc).toBeGreaterThan(50);
      expect(del).toBeGreaterThan(20);
      expect(err).toBeLessThan(0.005 * (acc + del));
    }
  });

  it('stays within [mains - 1, maxC] under extreme forcing, never NaN', () => {
    const p = params(1500);
    let s = initialTank(p, MAINS);
    for (let i = 0; i < 400; i++) {
      const charging = Math.floor(i / 40) % 2 === 0;
      s = stepTank(
        s,
        p,
        { chargeW: charging ? 200_000 : 0, chargeC: 120, dischargeW: charging ? 0 : 150_000, mainsC: MAINS, ambientC: 35 },
        0.25,
      );
      expect(Number.isNaN(s.topC) || Number.isNaN(s.bottomC) || Number.isNaN(s.soc)).toBe(false);
      expect(s.topC).toBeLessThanOrEqual(p.maxC + 1e-9);
      expect(s.bottomC).toBeLessThanOrEqual(p.maxC + 1e-9);
      expect(s.topC).toBeGreaterThanOrEqual(MAINS - 1);
      expect(s.bottomC).toBeGreaterThanOrEqual(MAINS - 1);
      expect(s.soc).toBeGreaterThanOrEqual(0);
      expect(s.soc).toBeLessThanOrEqual(1);
    }
  });
});

describe('tank behaviour', () => {
  it('standby-only decay is realistic (1-2 m3 well insulated: report the number)', () => {
    const out: Record<string, number> = {};
    for (const [vol, u] of [
      [1000, 0.4],
      [1000, 0.5],
      [2000, 0.4],
      [2000, 0.5],
    ] as const) {
      const p = params(vol, u, [60, 60]);
      let s = initialTank(p, MAINS);
      const e0 = tankEnergyKWhTh(s, p, MAINS);
      let loss = 0;
      for (let i = 0; i < 96; i++) {
        const r = stepTankDetailed(s, p, { chargeW: 0, chargeC: 60, dischargeW: 0, mainsC: MAINS, ambientC: AMB }, 0.25);
        s = r.state;
        loss += (r.lossW * 0.25) / 1000;
      }
      const dE = e0 - tankEnergyKWhTh(s, p, MAINS);
      expect(dE).toBeCloseTo(loss, 2);
      expect(loss).toBeGreaterThan(0.8);
      expect(loss).toBeLessThan(5);
      expect(s.topC).toBeLessThan(60);
      expect(s.topC).toBeGreaterThan(55);
      out[`${vol}L_U${u}`] = Math.round(loss * 100) / 100;
    }
    console.info('standby loss kWh/day @60C, ambient 28C:', JSON.stringify(out));
  });

  it('charge goes to the top node when hotter than the top, otherwise to the bottom', () => {
    const p = params(2000, 0.5, [50, 30]);
    const s0 = initialTank(p, MAINS);
    const hot = stepTank(s0, p, { chargeW: 5000, chargeC: 70, dischargeW: 0, mainsC: MAINS, ambientC: AMB }, 0.25);
    expect(hot.topC - s0.topC).toBeGreaterThan(0.5);
    expect(hot.bottomC - s0.bottomC).toBeLessThan(0.3); // only slow mixing
    const warm = stepTank(s0, p, { chargeW: 5000, chargeC: 42, dischargeW: 0, mainsC: MAINS, ambientC: AMB }, 0.25);
    expect(warm.bottomC - s0.bottomC).toBeGreaterThan(0.5);
    expect(warm.topC - s0.topC).toBeLessThan(0.3);
  });

  it('never heats a node above the charge fluid temperature and reports rejected heat', () => {
    const p = params(1000, 0.5, [40, 40]);
    let s = initialTank(p, MAINS);
    let rejected = 0;
    for (let i = 0; i < 80; i++) {
      const r = stepTankDetailed(s, p, { chargeW: 20_000, chargeC: 55, dischargeW: 0, mainsC: MAINS, ambientC: AMB }, 0.25);
      s = r.state;
      rejected += r.rejectedChargeW;
    }
    expect(s.topC).toBeLessThanOrEqual(55 + 1e-6);
    expect(s.bottomC).toBeLessThanOrEqual(55 + 1e-6);
    expect(rejected).toBeGreaterThan(0);
  });

  it('headroom shrinks to zero as the tank fills to maxC', () => {
    const p = params(1000, 0.5, [40, 30]);
    const s0 = initialTank(p, MAINS);
    const h0 = tankHeadroomW(s0, p, 0.25);
    expect(h0).toBeGreaterThan(0);
    let s = s0;
    for (let i = 0; i < 200; i++) {
      s = stepTank(s, p, { chargeW: 30_000, chargeC: 90, dischargeW: 0, mainsC: MAINS, ambientC: AMB }, 0.25);
    }
    expect(tankHeadroomW(s, p, 0.25)).toBeLessThan(0.02 * h0);
    expect(s.soc).toBeGreaterThan(0.97);
  });

  it('discharge cools the top, returns near mains + approach and cannot overdraw', () => {
    const p = params(1000, 0.5, [60, 60]);
    let s: TankState = initialTank(p, MAINS);
    let delivered = 0;
    for (let i = 0; i < 96; i++) {
      const r = stepTankDetailed(s, p, { chargeW: 0, chargeC: 60, dischargeW: 20_000, mainsC: MAINS, ambientC: AMB }, 0.25);
      s = r.state;
      delivered += (r.deliveredDischargeW * 0.25) / 1000;
      expect(s.topC).toBeGreaterThanOrEqual(MAINS + RETURN_APPROACH_K - 1);
    }
    const stored = tankEnergyKWhTh({ topC: 60, bottomC: 60 }, p, MAINS + RETURN_APPROACH_K);
    expect(delivered).toBeLessThanOrEqual(stored + 1e-6 + 2); // plus a little ambient gain at the cold end
    expect(s.soc).toBeLessThan(0.25);
  });

  it('is insensitive to the step size (0,25 h vs 0,02 h)', () => {
    const p = params(3000);
    const run = (dt: number) => {
      let s = initialTank(p, MAINS);
      for (let i = 0; i < Math.round(12 / dt); i++) {
        const h = i * dt;
        s = stepTank(
          s,
          p,
          { chargeW: h < 6 ? 30_000 : 0, chargeC: 70, dischargeW: h >= 6 ? 12_000 : 0, mainsC: MAINS, ambientC: AMB },
          dt,
        );
      }
      return s;
    };
    const a = run(0.25);
    const b = run(0.02);
    expect(Math.abs(a.topC - b.topC)).toBeLessThan(0.5);
    expect(Math.abs(a.bottomC - b.bottomC)).toBeLessThan(0.5);
  });

  it('initialTank clamps to [mains, maxC] and sets soc', () => {
    const p = { ...params(1000), initialTopC: 120, initialBottomC: 10 };
    const s = initialTank(p, MAINS);
    expect(s.topC).toBe(85);
    expect(s.bottomC).toBe(MAINS);
    expect(s.soc).toBeGreaterThan(0);
    expect(s.soc).toBeLessThan(1);
  });
});
