import { describe, expect, it } from 'vitest';
import { compareBaselines, ledgerFor } from '../carbon';
import { economicsFor } from '../economics';
import type { BaselineId } from '../contract';
import { inputsFixture, sysFixture } from './w4-fixtures';

const IDS: BaselineId[] = ['B1', 'B2', 'B3', 'B4'];

describe('ekonomi vs pembanding', () => {
  it('capex inkremental berurutan rendah ≤ tengah ≤ tinggi, tanpa NaN, balik modal rendah ≤ tinggi', () => {
    const sys = sysFixture();
    const b = inputsFixture();
    const cmp = compareBaselines(sys, b);
    for (const id of IDS) {
      const e = cmp.economics[id];
      expect(e.baselineId).toBe(id);
      expect(e.capexIdr[0]).toBeLessThanOrEqual(e.capexIdr[1]);
      expect(e.capexIdr[1]).toBeLessThanOrEqual(e.capexIdr[2]);
      expect(Number.isNaN(e.annualSavingIdr)).toBe(false);
      e.paybackYears.forEach((p) => expect(Number.isNaN(p)).toBe(false));
      expect(e.tag).toBe('asumsi');
    }
  });

  it('terhadap B1 (LPG): penghematan positif dan balik modal hingga', () => {
    const sys = sysFixture();
    const b = inputsFixture();
    const e = economicsFor(sys, ledgerFor(sys, b, 'B1'), b);
    // 40.000 kWh_th LPG/0,85 /12,8 kWh/kg × Rp16.000 + 20.000 kWh_e × Rp1.450 − 1.500 × Rp1.450 − O&M
    expect(e.annualSavingIdr).toBeGreaterThan(50_000_000);
    expect(e.capexIdr[1]).toBeGreaterThan(0);
    expect(Number.isFinite(e.paybackYears[1])).toBe(true);
    expect(e.paybackYears[0]).toBeLessThan(e.paybackYears[2]);
  });

  it('biaya LPG memakai NCV 12,8 kWh/kg dan harga per kg', () => {
    const sys = sysFixture();
    sys.economics.gridTariffIdrPerKWh = 0; // hanya LPG yang bernilai
    sys.economics.omFractionPerYear = 0;
    const b = inputsFixture({ svBackup: 0 }); // seluruh 80.000 kWh_th disurya
    const e = economicsFor(sys, ledgerFor(sys, b, 'B1'), b);
    expect(e.annualSavingIdr).toBeCloseTo((80_000 / 0.85 / 12.8) * 16_000, 3);
  });

  it('Infinity bila penghematan ≤ 0', () => {
    const sys = sysFixture();
    const b = inputsFixture({ svPv: 0, svBackup: 80_000, svPar: 2_000 });
    for (const id of IDS) {
      const e = economicsFor(sys, ledgerFor(sys, b, id), b);
      if (e.annualSavingIdr <= 0) e.paybackYears.forEach((p) => expect(p).toBe(Infinity));
    }
    const e1 = economicsFor(sys, ledgerFor(sys, b, 'B1'), b);
    expect(e1.annualSavingIdr).toBeLessThan(0);
    expect(e1.paybackYears).toEqual([Infinity, Infinity, Infinity]);
  });

  it('desikan tidak masuk capex kecuali diminta', () => {
    const sys = sysFixture({ desiccantOn: true });
    const b = inputsFixture();
    const l = ledgerFor(sys, b, 'B1');
    const base = economicsFor(sys, l, b);
    const withD = economicsFor(sys, l, b, { includeDesiccant: true });
    expect(withD.capexIdr[1] - base.capexIdr[1]).toBe(sys.economics.capexDesiccantIdr[1]);
  });

  it('luas 0: tanpa capex dan tanpa penghematan terhadap B1', () => {
    const sys = sysFixture();
    const b = { ...inputsFixture({ area: 0, svPv: 0, svPar: 0, svBackup: 80_000, convPv: 0 }) };
    const e = economicsFor(sys, ledgerFor(sys, b, 'B1'), b);
    expect(e.capexIdr).toEqual([0, 0, 0]);
    expect(e.annualSavingIdr).toBeCloseTo(0, 6);
    expect(e.paybackYears).toEqual([Infinity, Infinity, Infinity]);
  });
});
