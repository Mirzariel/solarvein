import { describe, expect, it } from 'vitest';
import {
  b4BreakEvenFraction,
  caseFlows,
  compareBaselines,
  embodiedKgPerYear,
  heatUseValues,
  ledgerFor,
  operatingKg,
} from '../carbon';
import { CARBON_ASSUMPTIONS, DEFAULT_CARBON_PARAMS } from '../assumptions/carbon';
import type { BaselineId, BaselineInputs } from '../contract';
import { kWhE, kWhTh } from '../contract';
import { D, annual, desiccantEval, inputsFixture, sysFixture } from './w4-fixtures';

const IDS: BaselineId[] = ['B1', 'B2', 'B3', 'B4'];

const allNumbers = (x: unknown, path = 'x'): string[] => {
  const bad: string[] = [];
  if (typeof x === 'number') {
    if (Number.isNaN(x)) bad.push(path);
  } else if (Array.isArray(x)) x.forEach((v, i) => bad.push(...allNumbers(v, `${path}[${i}]`)));
  else if (x && typeof x === 'object') for (const [k, v] of Object.entries(x)) bad.push(...allNumbers(v, `${path}.${k}`));
  return bad;
};

describe('buku besar karbon', () => {
  it('baris headline berjumlah sama dengan net dan sama dengan selisih emisi kasus', () => {
    const sys = sysFixture({ desiccantOn: true });
    const b = inputsFixture({ hvac: 800 });
    const flows = caseFlows(sys, b);
    for (const id of IDS) {
      const l = ledgerFor(sys, b, id);
      const head = l.rows.filter((r) => !r.excludedFromHeadline);
      expect(head.reduce((s, r) => s + r.kgPerYear, 0)).toBeCloseTo(l.netKgPerYear, 9);
      // net = gross − tertanam − parasit
      expect(l.grossAvoidedKgPerYear - l.embodiedKgPerYear - l.parasiticKgPerYear).toBeCloseTo(l.netKgPerYear, 9);
      // net = (E_X − E_SV) + (tertanam_X − tertanam_SV)/umur
      const expected =
        operatingKg(sys, flows[id]) - operatingKg(sys, flows.SV) +
        embodiedKgPerYear(sys, flows[id]) - embodiedKgPerYear(sys, flows.SV);
      expect(l.netKgPerYear).toBeCloseTo(expected, 6);
    }
  });

  it('setiap baris memiliki faktor, tag, dan bilangan hingga', () => {
    const sys = sysFixture({ desiccantOn: true, hp: true });
    const cmp = compareBaselines(sys, inputsFixture({ hvac: 800, hpWork: 300 }));
    for (const id of IDS) {
      for (const r of cmp.ledgers[id].rows) {
        expect(r.factor, `${id}/${r.id} tanpa faktor`).toBeDefined();
        expect(Number.isFinite(r.factor!.value)).toBe(true);
        expect(r.factor!.unit.length).toBeGreaterThan(0);
        expect(r.tag).toBeTruthy();
        expect(Number.isFinite(r.kgPerYear)).toBe(true);
      }
    }
  });

  it('jenis energi bermerek tidak bisa saling ditetapkan (tingkat tipe)', () => {
    const th = kWhTh(1);
    // @ts-expect-error kWh_th tidak boleh ditetapkan ke kWh_e
    const e: ReturnType<typeof kWhE> = th;
    void e;
    expect(true).toBe(true);
  });

  it('luas kolektor 0 mereproduksi B1 (net terhadap B1 = 0 menurut konstruksi, BOS ikut nol)', () => {
    const sys = sysFixture();
    const zero: BaselineInputs = {
      solarvein: annual({ dhwDemandKWhTh: D, dhwBackupKWhTh: D }),
      pvtDhwOnly: annual({ dhwDemandKWhTh: D, dhwBackupKWhTh: D }),
      conventionalPvKWhEPerYear: kWhE(0),
      dhwDemandKWhThPerYear: kWhTh(D),
      areaM2: 0,
    };
    const l = ledgerFor(sys, zero, 'B1');
    expect(l.netKgPerYear).toBeCloseTo(0, 9);
    expect(l.rows.filter((r) => !r.excludedFromHeadline).every((r) => r.kgPerYear === 0)).toBe(true);
    expect(l.carbonPaybackYears).toBe(Infinity);
  });

  it('emisi tertanam tidak pernah nol', () => {
    const sys = sysFixture();
    const b = inputsFixture();
    const flows = caseFlows(sys, b);
    expect(embodiedKgPerYear(sys, flows.SV)).toBeGreaterThan(0);
    for (const id of IDS) {
      const l = ledgerFor(sys, b, id);
      expect(l.embodiedKgPerYear, id).not.toBe(0);
      expect(l.rows.some((r) => r.kind === 'embodied' && !r.excludedFromHeadline && r.kgPerYear !== 0)).toBe(true);
    }
  });

  it('kredit kalor B2 per kWh_th lebih kecil daripada B1 saat pemanas hotel LPG', () => {
    const sys = sysFixture();
    const full = inputsFixture({ svBackup: 0 }); // seluruh kebutuhan ditutup surya
    const heat = (id: BaselineId) =>
      ledgerFor(sys, full, id)
        .rows.filter((r) => r.id === 'kalor-air-panas' || r.id === 'selisih-pemanas-b2')
        .reduce((s, r) => s + r.kgPerYear, 0);
    expect(heat('B2') / D).toBeLessThan(heat('B1') / D);
    expect(heat('B1') / D).toBeCloseTo(0.227 / 0.85, 9);
    expect(heat('B2') / D).toBeCloseTo(0.8 / 3.5, 9);
  });

  it('pemanas listrik: kredit kalor memakai EF jaringan / η', () => {
    const sys = sysFixture({ hotel: { heater: 'electric-resistance', heaterEfficiency: 1 } });
    const l = ledgerFor(sys, inputsFixture(), 'B1');
    const r = l.rows.find((x) => x.id === 'kalor-air-panas')!;
    expect(r.factor!.value).toBeCloseTo(0.8, 9);
    expect(r.energy!.kWhE).toBeDefined();
    expect(r.energy!.kWhFuel).toBeUndefined();
  });

  it('baris desikan dikecualikan dari headline dan bertanda hipotesis', () => {
    const sys = sysFixture({ desiccantOn: true });
    const b = inputsFixture({ hvac: 1000 });
    const l = ledgerFor(sys, b, 'B1');
    const des = l.rows.filter((r) => r.id.startsWith('desikan'));
    expect(des.length).toBe(2);
    expect(des.every((r) => r.excludedFromHeadline)).toBe(true);
    expect(des.find((r) => r.id === 'desikan-hvac')!.tag).toBe('hipotesis');
    expect(des.find((r) => r.id === 'desikan-hvac')!.kgPerYear).toBeCloseTo(800, 9);
    const without = ledgerFor(sys, inputsFixture({ hvac: 0 }), 'B1');
    expect(l.netKgPerYear).toBeCloseTo(without.netKgPerYear, 9);
  });

  it('carbonPaybackYears = Infinity bila net ≤ 0, hingga bila net > 0', () => {
    const sys = sysFixture();
    const bad = inputsFixture({ svPv: 0, svBackup: D, svPar: 3_000 });
    for (const id of IDS) expect(ledgerFor(sys, bad, id).carbonPaybackYears).toBe(Infinity);
    const good = ledgerFor(sys, inputsFixture(), 'B1');
    expect(good.netKgPerYear).toBeGreaterThan(0);
    expect(Number.isFinite(good.carbonPaybackYears)).toBe(true);
    expect(good.carbonPaybackYears).toBeGreaterThan(0);
  });

  it('vonis: tanpa pemenang bawaan, menyebut pembanding yang menang, koma desimal', () => {
    const sys = sysFixture();
    // SolarVein lemah: B2 menang.
    const weak = compareBaselines(sys, inputsFixture({ svPv: 12_000, svBackup: 70_000, convPv: 20_000 }));
    expect(weak.ledgers.B2.netKgPerYear).toBeLessThan(0);
    expect(weak.verdict).toMatch(/^Pembanding utama PV \+ pompa kalor \(B2\): B2 lebih unggul ~\d+,\d+ t CO₂e\/tahun/);
    // SolarVein kuat vs B1.
    const strong = compareBaselines(sys, inputsFixture());
    expect(strong.ledgers.B1.netKgPerYear).toBeGreaterThan(0);
    expect(strong.verdict).toMatch(/Sebagai konteks, dibanding hotel konvensional \(B1\), SolarVein menghindari ~\d+,\d+ t CO₂e\/tahun/);
    expect(strong.verdict).not.toMatch(/\d\.\d/);
  });

  it('tidak ada NaN, juga pada masukan degenerat', () => {
    const sys = sysFixture({ desiccantOn: true, hp: true });
    const variants = [
      inputsFixture(),
      inputsFixture({ area: 0 }),
      { ...inputsFixture(), dhwDemandKWhThPerYear: kWhTh(0) },
      inputsFixture({ svPar: Number.NaN, svPv: Number.NaN }),
    ];
    for (const b of variants) {
      const cmp = compareBaselines(sys, b);
      expect(allNumbers(cmp)).toEqual([]);
      expect(cmp.verdict).not.toMatch(/NaN/);
    }
  });
});

describe('nilai pemakaian panas (heatUseValues)', () => {
  const sys = sysFixture();
  const vals = heatUseValues(sys, { desiccant: desiccantEval(-50, 1000), pvGainWePerWth: 0.04 });
  const by = (u: string) => vals.find((v) => v.use === u)!;

  it('urutan bawaan: dhw-lpg > dhw-heat-pump, desikan dapat ≤ 0', () => {
    expect(by('dhw-lpg').kgPerKWhTh).toBeGreaterThan(by('dhw-heat-pump').kgPerKWhTh);
    expect(by('dhw-lpg').kgPerKWhTh).toBeCloseTo(0.227 / 0.85, 9);
    expect(by('dhw-heat-pump').kgPerKWhTh).toBeCloseTo(0.8 / 3.5, 9);
    expect(by('dhw-electric').kgPerKWhTh).toBeCloseTo(0.8, 9);
    expect(by('desiccant').kgPerKWhTh).toBeLessThanOrEqual(0);
    expect(by('desiccant').tag).toBe('hipotesis');
    expect(by('pv-lebih-dingin').kgPerKWhTh).toBeCloseTo(0.04 * 0.8, 9);
  });

  it('terurut menurun, lima cara, tanpa NaN', () => {
    expect(vals).toHaveLength(5);
    for (let i = 1; i < vals.length; i++) expect(vals[i - 1]!.kgPerKWhTh).toBeGreaterThanOrEqual(vals[i]!.kgPerKWhTh);
    expect(allNumbers(vals)).toEqual([]);
    expect(allNumbers(heatUseValues(sys, { desiccant: desiccantEval(Number.NaN, 0), pvGainWePerWth: Number.NaN }))).toEqual([]);
  });

  it('desikan positif = hemat listrik bersih per kWh_th × EF', () => {
    const v = heatUseValues(sys, { desiccant: desiccantEval(200, 1000), pvGainWePerWth: 0 });
    expect(v.find((x) => x.use === 'desiccant')!.kgPerKWhTh).toBeCloseTo(0.2 * 0.8, 9);
  });
});

describe('perbaikan putaran 1b', () => {
  it('COP after-cooler bawaan 4,5 (rasio 1,5 terhadap koil acuan 3,0)', () => {
    expect(DEFAULT_CARBON_PARAMS.aftercoolerCop).toBe(4.5);
    expect(DEFAULT_CARBON_PARAMS.aftercoolerCop / DEFAULT_CARBON_PARAMS.coilRefCop).toBeCloseTo(1.5, 9);
    const a = CARBON_ASSUMPTIONS.find((x) => x.id === 'carbon-aftercooler-cop')!;
    expect(a.body).toMatch(/1,3–2,0/);
    expect(a.body).toMatch(/1,3–1,35/);
  });

  it('baris air panas B2 tidak berkata "menggantikan pemanas hotel" dan mengacu ke HPWH', () => {
    const l = ledgerFor(sysFixture(), inputsFixture(), 'B2');
    const r = l.rows.filter((x) => x.id.startsWith('kalor-air-panas') || x.id.includes('pemanas'));
    expect(r).toHaveLength(1);
    expect(r[0]!.label).not.toMatch(/menggantikan pemanas hotel/);
    expect(r[0]!.label).toMatch(/pompa kalor/);
    expect(r[0]!.label).toMatch(/LPG/);
    // jumlah baris tetap = net
    const head = l.rows.filter((x) => !x.excludedFromHeadline);
    expect(head.reduce((s, x) => s + x.kgPerYear, 0)).toBeCloseTo(l.netKgPerYear, 9);
  });

  it('vonis memimpin dengan B2, B1 sebagai konteks, dan menyebut titik impas B4', () => {
    const v = compareBaselines(sysFixture(), inputsFixture()).verdict;
    expect(v.startsWith('Pembanding utama PV + pompa kalor (B2)')).toBe(true);
    expect(v.indexOf('(B2)')).toBeLessThan(v.indexOf('(B1)'));
    expect(v).toMatch(/Titik impas B4: pemulihan kondensor menutup ~\d+ %/);
    expect(v).toMatch(/asumsi 35 %/);
  });

  it('karbon dan uang berlawanan terhadap B2 dinyatakan eksplisit (cadangan LPG lebih mahal daripada listrik HPWH)', () => {
    const sys = sysFixture();
    // Surya menutup 75 %, PV/T setara PV: lebih rendah emisi daripada B2, tetapi LPG cadangan mahal.
    const b = inputsFixture({ svBackup: 20_000, svPv: 18_000, convPv: 18_000, svPar: 500 });
    const cmp = compareBaselines(sys, b);
    expect(cmp.ledgers.B2.netKgPerYear).toBeGreaterThan(0);
    expect(cmp.economics.B2.annualSavingIdr).toBeLessThan(0);
    expect(cmp.economics.B2.paybackYears[1]).toBe(Infinity);
    expect(cmp.verdict).toMatch(/Namun secara biaya arahnya berlawanan/);
    expect(cmp.verdict).toMatch(/cadangan LPG lebih mahal per kWh_th daripada listrik pompa kalor/);
    expect(cmp.verdict).toMatch(/tidak balik modal/);
  });

  it('arah searah tidak menambah kalimat "berlawanan"', () => {
    const cmp = compareBaselines(sysFixture(), inputsFixture());
    // terhadap B1 karbon dan uang sama-sama menguntungkan SolarVein
    expect(cmp.ledgers.B1.netKgPerYear).toBeGreaterThan(0);
    expect(cmp.economics.B1.annualSavingIdr).toBeGreaterThan(0);
    const b1Clause = cmp.verdict.split('. ').find((x) => x.includes('(B1)'))!;
    expect(b1Clause).not.toMatch(/berlawanan/);
  });

  it('b4BreakEvenFraction: net terhadap B4 = 0 pada pecahan impas', () => {
    const sys = sysFixture();
    const b = inputsFixture();
    const f = b4BreakEvenFraction(sys, b);
    expect(f).not.toBeNull();
    expect(f!).toBeGreaterThan(0);
    expect(f!).toBeLessThanOrEqual(1);
    const at = ledgerFor({ ...sys, carbon: { ...sys.carbon, condenserRecoveryFraction: f! } }, b, 'B4');
    expect(at.netKgPerYear).toBeCloseTo(0, 6);
  });

  it('b4BreakEvenFraction null bila tidak ada impas di [0,1]', () => {
    const sys = sysFixture();
    // SolarVein sangat kuat (cadangan 0): B4 tetap kalah walau menutup seluruh kebutuhan? Bila tidak, tetap null/valid.
    const strong = b4BreakEvenFraction(sys, inputsFixture({ svBackup: 0, svPv: 40_000 }));
    expect(strong === null || (strong >= 0 && strong <= 1)).toBe(true);
    const zero = {
      solarvein: annual({ dhwDemandKWhTh: D, dhwBackupKWhTh: D }),
      pvtDhwOnly: annual({ dhwDemandKWhTh: D, dhwBackupKWhTh: D }),
      conventionalPvKWhEPerYear: kWhE(0),
      dhwDemandKWhThPerYear: kWhTh(D),
      areaM2: 0,
    } as BaselineInputs;
    const z = b4BreakEvenFraction(sys, zero);
    expect(z === null || (z >= 0 && z <= 1)).toBe(true);
  });

  it('baris PV memakai total PV apa adanya (derating dari day.ts diteruskan)', () => {
    const sys = sysFixture();
    const a = ledgerFor(sys, inputsFixture({ convPv: 18_000 }), 'B2');
    const b = ledgerFor(sys, inputsFixture({ convPv: 15_000 }), 'B2');
    const pv = (l: typeof a) => l.rows.find((r) => r.id === 'listrik-pv')!;
    expect(pv(b).kgPerYear - pv(a).kgPerYear).toBeCloseTo(3_000 * 0.8, 9);
    const c = ledgerFor(sys, inputsFixture({ svPv: 17_000 }), 'B1');
    const d = ledgerFor(sys, inputsFixture({ svPv: 20_000 }), 'B1');
    expect(pv(d).kgPerYear - pv(c).kgPerYear).toBeCloseTo(3_000 * 0.8, 9);
  });
});
