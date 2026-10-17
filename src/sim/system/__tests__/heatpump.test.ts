import { describe, expect, it } from 'vitest';
import { COND_APPROACH_K, EVAP_APPROACH_K, carnotCopHeating, heatPumpCop, heatPumpWork } from '../heatpump';

describe('heatPumpCop', () => {
  it('15 -> 58 C with Carnot fraction 0,45 lands in 3,0-3,8', () => {
    const cop = heatPumpCop(15, 58, 0.45);
    expect(cop).toBeGreaterThanOrEqual(3.0);
    expect(cop).toBeLessThanOrEqual(3.8);
  });

  it('never exceeds fraction x Carnot of the same refrigerant temperatures', () => {
    for (const src of [5, 15, 25, 35]) {
      for (const sink of [40, 50, 58, 65]) {
        for (const f of [0.3, 0.45, 0.6]) {
          const carnot = carnotCopHeating(src - EVAP_APPROACH_K, sink + COND_APPROACH_K);
          const cop = heatPumpCop(src, sink, f);
          if (cop > 1) expect(cop).toBeLessThanOrEqual(f * carnot + 1e-9);
        }
      }
    }
  });

  it('decreases with lift (colder source or hotter sink)', () => {
    expect(heatPumpCop(25, 58, 0.45)).toBeGreaterThan(heatPumpCop(15, 58, 0.45));
    expect(heatPumpCop(15, 58, 0.45)).toBeGreaterThan(heatPumpCop(5, 58, 0.45));
    expect(heatPumpCop(15, 45, 0.45)).toBeGreaterThan(heatPumpCop(15, 65, 0.45));
  });

  it('is clamped to at least 1 and stays finite for tiny or negative lifts', () => {
    expect(heatPumpCop(-30, 80, 0.2)).toBeGreaterThanOrEqual(1);
    const flat = heatPumpCop(40, 40, 0.45);
    expect(Number.isFinite(flat)).toBe(true);
    expect(heatPumpCop(60, 30, 0.45)).toBeLessThanOrEqual(10);
  });
});

describe('heatPumpWork', () => {
  it('work = Q/COP and source = Q - work, never negative', () => {
    const { workWe, sourceW } = heatPumpWork(10_000, 3.5);
    expect(workWe).toBeCloseTo(10_000 / 3.5, 8);
    expect(sourceW).toBeCloseTo(10_000 - 10_000 / 3.5, 8);
    expect(workWe + sourceW).toBeCloseTo(10_000, 8);
  });
  it('handles zero, negative duty and COP < 1', () => {
    expect(heatPumpWork(0, 3)).toEqual({ workWe: 0, sourceW: 0 });
    expect(heatPumpWork(-50, 3)).toEqual({ workWe: 0, sourceW: 0 });
    const r = heatPumpWork(1000, 0.5);
    expect(r.workWe).toBeCloseTo(1000, 8);
    expect(r.sourceW).toBe(0);
  });
});
