import { describe, expect, it } from 'vitest';
import { PRESETS, compareConfigurations } from '../sim';
import { computeVerdict, winnerOf } from './verdict';

describe('computeVerdict', () => {
  it('preset cerah: panen panas aktif, tidak menyatakan mode ganda unggul', () => {
    const v = computeVerdict(compareConfigurations(PRESETS.sunny));
    expect(v.kind).toBe('harvest');
  });

  it('preset hujan: pembuangan hanya SolarVein', () => {
    const v = computeVerdict(compareConfigurations(PRESETS.rainy));
    expect(['rejection', 'rejection-not-worth', 'conventional-better']).toContain(v.kind);
  });

  it('tanpa beban panas dan tanpa sumber panas: PV konvensional lebih baik', () => {
    const v = computeVerdict(compareConfigurations({ ...PRESETS.sunny, heatLoadAvailable: false, hotSourceAvailable: false }));
    expect(v.kind).toBe('conventional-better');
    expect(v.headline).toContain('PV konvensional');
  });

  it('headline and reasons use the net rejection benefit after pump and PV penalty', () => {
    const d = compareConfigurations({ ...PRESETS.rainy, coolingCOP: 30 });
    const v = computeVerdict(d);
    expect(v.kind).toBe('rejection');
    const net = d['solarvein-dual'].avoidedCoolingElecW + d['solarvein-dual'].netElectricalW - d['conventional-pv'].netElectricalW;
    expect(v.headline).toContain('sekitar ' + Math.round(net) + ' W');
    expect(v.reasons.join(' ')).toContain('setelah pompa dan penurunan daya PV');
  });

  it('a tie between PV + cooling-liquid and SolarVein has no winner', () => {
    const d = compareConfigurations(PRESETS.sunny);
    const v = computeVerdict(d);
    expect(v.kind).toBe('harvest');
    expect(winnerOf(v, d)).toBeNull();
  });

  it('conventional PV is the winner when there is no load and no source', () => {
    const d = compareConfigurations({ ...PRESETS.sunny, heatLoadAvailable: false, hotSourceAvailable: false });
    expect(winnerOf(computeVerdict(d), d)).toBe('conventional-pv');
  });
});
