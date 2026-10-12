import { describe, expect, it } from 'vitest';
import { simulateDay, summarizeDay } from './day';
import { PRESETS } from './presets';

describe('simulateDay', () => {
  it('cerah: 13 hourly points 6..18, bell-shaped irradiance, no rain, ambient 26 to 33 to 29', () => {
    const d = simulateDay(PRESETS.sunny, 'cerah');
    expect(d.map((p) => p.hour)).toEqual([6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18]);
    expect(d[0]!.irradiance).toBeCloseTo(0, 6);
    expect(d[6]!.irradiance).toBeCloseTo(900, 6);
    expect(d[12]!.irradiance).toBeCloseTo(0, 6);
    expect(d.every((p) => p.rainMmH === 0)).toBe(true);
    expect(d[0]!.ambientC).toBeCloseTo(26, 6);
    expect(d[8]!.ambientC).toBeCloseTo(33, 6);
    expect(d[12]!.ambientC).toBeCloseTo(29, 6);
    const peak = d.reduce((m, p) => (p.result.cellC > m.result.cellC ? p : m));
    expect(peak.hour).toBeGreaterThanOrEqual(11);
    expect(peak.hour).toBeLessThanOrEqual(15);
    expect(d[6]!.result.regime).toBe('harvest');
    expect(d.every((p) => Math.abs(p.result.energyBalanceResidualW) < 0.5)).toBe(true);
  });

  it('hujan: overcast, low irradiance, rain bursts in the afternoon, cooler than cerah', () => {
    const d = simulateDay(PRESETS.rainy, 'hujan');
    const cerah = simulateDay(PRESETS.rainy, 'cerah');
    expect(d).toHaveLength(13);
    expect(Math.max(...d.map((p) => p.irradiance))).toBeLessThanOrEqual(250);
    expect(Math.max(...d.map((p) => p.irradiance))).toBeGreaterThan(100);
    const rainHours = d.filter((p) => p.rainMmH > 0).map((p) => p.hour);
    expect(rainHours).toEqual([13, 14, 15, 16, 17]);
    expect(d.filter((p) => p.hour < 13).every((p) => p.rainMmH === 0)).toBe(true);
    const mean = (ps: typeof d) => ps.reduce((s, p) => s + p.ambientC, 0) / ps.length;
    expect(mean(d)).toBeLessThan(mean(cerah));
    expect(d.some((p) => p.result.regime === 'reject')).toBe(true);
    expect(d.every((p) => Math.abs(p.result.energyBalanceResidualW) < 0.5)).toBe(true);
  });

  it('respects the requested config and base inputs', () => {
    const d = simulateDay({ ...PRESETS.sunny, inletC: 35 }, 'cerah', 'conventional-pv');
    expect(d.every((p) => p.result.config === 'conventional-pv' && !p.result.pumpOn)).toBe(true);
    expect(d.every((p) => p.result.inputs.inletC === 35)).toBe(true);
  });

  it('daily summary: dual harvests useful heat on a sunny day and electricity is positive', () => {
    const s = summarizeDay(simulateDay(PRESETS.sunny, 'cerah'));
    expect(s.electricalKWh).toBeGreaterThan(0.5);
    expect(s.usefulHeatKWh).toBeGreaterThan(1);
    expect(s.heatRejectedKWh).toBe(0);
    expect(s.netElectricalKWh).toBeLessThan(s.electricalKWh);
  });
});
