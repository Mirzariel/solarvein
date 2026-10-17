import { describe, expect, it } from 'vitest';
import {
  DEFAULT_PREHEAT_EFFECTIVENESS,
  WATER_CP_J_PER_KG_K,
  WATER_RHO_KG_PER_L,
  dhwDemandW,
  preheatOutletC,
  preheatW,
} from '../dhw';

const MAINS = 28;
const SET = 60;

describe('preheatW', () => {
  it('is zero when there is no draw', () => {
    expect(preheatW(0, 70, MAINS, SET)).toBe(0);
    expect(preheatW(-5, 70, MAINS, SET)).toBe(0);
  });

  it('is zero when the source is not warmer than the mains', () => {
    expect(preheatW(300, MAINS, MAINS, SET)).toBe(0);
    expect(preheatW(300, 20, MAINS, SET)).toBe(0);
  });

  it('equals eps * m * cp * (source - mains) below the setpoint', () => {
    const draw = 360; // L/h
    const mdot = (draw * WATER_RHO_KG_PER_L) / 3600;
    const q = preheatW(draw, 45, MAINS, SET, 0.7);
    expect(q).toBeCloseTo(0.7 * mdot * WATER_CP_J_PER_KG_K * (45 - MAINS), 6);
  });

  it('second law: potable outlet never exceeds the source temperature', () => {
    for (const src of [30, 38, 45, 59, 60, 75, 90]) {
      for (const eps of [0.3, 0.7, 0.8, 1, 1.5]) {
        const out = preheatOutletC(250, src, MAINS, SET, eps);
        expect(out).toBeLessThanOrEqual(src + 1e-9);
        expect(out).toBeGreaterThanOrEqual(MAINS);
      }
    }
  });

  it('never heats above the setpoint and is capped at the demand', () => {
    for (const draw of [50, 400, 2000]) {
      const q = preheatW(draw, 85, MAINS, SET, 1);
      expect(q).toBeLessThanOrEqual(dhwDemandW(draw, MAINS, SET) + 1e-9);
      expect(preheatOutletC(draw, 85, MAINS, SET, 1)).toBeLessThanOrEqual(SET + 1e-9);
    }
    // eps 0.7, source 85: uncapped 0.7*(57) = 39.9 K > 32 K needed -> capped at the demand
    expect(preheatW(400, 85, MAINS, SET, 0.7)).toBeCloseTo(dhwDemandW(400, MAINS, SET), 6);
  });

  it('scales linearly with the draw below the cap and rises with the source temperature', () => {
    expect(preheatW(200, 40, MAINS, SET)).toBeCloseTo(2 * preheatW(100, 40, MAINS, SET), 8);
    expect(preheatW(200, 50, MAINS, SET)).toBeGreaterThan(preheatW(200, 40, MAINS, SET));
  });

  it('uses the documented default effectiveness 0,7', () => {
    expect(DEFAULT_PREHEAT_EFFECTIVENESS).toBe(0.7);
    expect(preheatW(100, 40, MAINS, SET)).toBeCloseTo(preheatW(100, 40, MAINS, SET, 0.7), 12);
  });
});
