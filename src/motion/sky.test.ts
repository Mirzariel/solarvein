import { describe, expect, it } from 'vitest';
import { DEFAULT_SYSTEM, MODE_TARGETS } from '../sim/system';
import { daylight, skyLevels, twilight } from './sky';
import { targetAt } from './systemTarget';

const at = (sc: 'terik' | 'berawan' | 'hujan', h: number) => {
  const t = targetAt(DEFAULT_SYSTEM, sc, 'adaptive', h);
  return skyLevels(t.climate.irradiance, t.climate.rainMmH, t.climate.rh, h % 24);
};

describe('sky levels', () => {
  it('stay in 0..1 over the whole day for every scenario', () => {
    for (const sc of ['terik', 'berawan', 'hujan'] as const)
      for (let h = 0; h <= 24; h += 0.25) for (const v of Object.values(at(sc, h))) {
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThanOrEqual(1);
      }
  });
  it('reads as noon, dawn, humid grey and night', () => {
    const noon = at('terik', MODE_TARGETS.A.hour);
    const humid = at('hujan', MODE_TARGETS.B.hour);
    const night = at('terik', MODE_TARGETS.C.hour);
    const dawn = at('terik', 6.1);
    expect(noon.sun).toBeGreaterThan(0.8);
    expect(noon.night).toBe(0);
    expect(humid.sun).toBeLessThan(0.1);
    expect(humid.rain).toBeGreaterThan(0.5);
    expect(night.sun).toBe(0);
    expect(night.night).toBeGreaterThan(0.05);
    expect(dawn.dawn).toBeGreaterThan(0.3);
    expect(noon.dawn).toBe(0);
  });
  it('daylight and twilight are smooth and bounded', () => {
    expect(daylight(2)).toBe(0);
    expect(daylight(12)).toBe(1);
    expect(twilight(12)).toBe(0);
    expect(twilight(6)).toBeGreaterThan(0.9);
  });
});
