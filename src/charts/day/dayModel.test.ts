import { describe, expect, it } from 'vitest';
import { DEFAULT_SYSTEM, getSystemView } from '../../sim/system';
import { buildDayModel, clockLabel, cumulativeAt } from './dayModel';

describe('dayModel', () => {
  const view = getSystemView(DEFAULT_SYSTEM);
  for (const sc of ['terik', 'berawan', 'hujan', 'hujan-3-hari'] as const) {
    it(`${sc}: DHW supply layers sum to the demand and series are aligned`, () => {
      const m = buildDayModel(view.day(sc));
      expect(m.tMax).toBe(sc === 'hujan-3-hari' ? 72 : 24);
      for (let i = 0; i < m.t.length; i++) {
        const sum = (m.direct[i] ?? 0) + (m.fromTank[i] ?? 0) + (m.backup[i] ?? 0);
        expect(sum).toBeCloseTo(m.demand[i] ?? 0, 3);
      }
      expect(m.g.length).toBe(m.t.length);
      expect(m.soc.every((s) => s >= 0 && s <= 1)).toBe(true);
    });
  }

  it('cumulative totals grow monotonically and end at the day totals', () => {
    const day = view.day('terik');
    const m = buildDayModel(day);
    expect(cumulativeAt(m, 0).solarKWhTh).toBe(0);
    expect(cumulativeAt(m, 12).solarKWhTh).toBeGreaterThan(0);
    expect(cumulativeAt(m, 24).solarKWhTh).toBeCloseTo(day.totals.dhwSolarKWhTh, 0);
    expect(cumulativeAt(m, 24).backupKWhTh).toBeCloseTo(day.totals.dhwBackupKWhTh, 0);
  });

  it('formats clock labels', () => {
    expect(clockLabel(13.25, 24)).toBe('13:15');
    expect(clockLabel(24, 24)).toBe('24:00');
    expect(clockLabel(24, 72)).toBe('00:00');
    expect(clockLabel(37.5, 72)).toBe('13:30');
  });
});
