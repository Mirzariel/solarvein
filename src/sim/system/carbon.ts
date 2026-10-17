/**
 * SolarVein v2 — buku besar karbon terhadap pembanding B1–B4 (W4). Fungsi murni, tanpa React/DOM.
 *
 * Prinsip: layanan sama di semua kasus (kWh_th air panas pada suhu tuang yang sama, kebutuhan listrik sama,
 * kelembapan ruang sama). Karena sama, bagian yang sama saling meniadakan dan buku besar hanya memuat SELISIH:
 *
 *   baris = emisi(pembanding X) − emisi(SolarVein), bertanda: + = dihindari SolarVein, − = ditambahkan.
 *
 * Emisi operasi tiap kasus (kgCO₂e/tahun), dengan EF = faktor emisi jaringan:
 *   E = pemanas·f_pemanas + (parasit + kerja pompa kalor + pemanas listrik + HPWH/COP − PV)·EF
 * Listrik PV dianggap terpakai sendiri sepenuhnya (menggantikan listrik jaringan). Termal (kWh_th), listrik
 * (kWh_e) dan bahan bakar (kWh_fuel) selalu dikonversi lewat faktor yang ditampilkan di setiap baris.
 * Emisi tertanam dibagi umur pakai. Jalur desikan = baris terpisah `excludedFromHeadline`.
 * Lihat docs/physics/carbon.md.
 */
import type {
  RefIdLike,
  AnnualResult,
  BaselineComparison,
  BaselineId,
  BaselineInputs,
  CarbonLedger,
  DesiccantEval,
  HeatUseValue,
  LedgerRow,
  SystemInputs,
} from './contract';
import { kWhE, kWhFuel, kWhTh } from './contract';
import {
  B3_BOS_SHARE,
  CARBON_REF,
  ELECTRIC_HEATER_EFFICIENCY_DEFAULT,
  HPWH_COP_DEFAULT,
  LPG_BOILER_EFFICIENCY_DEFAULT,
  NEAR_ZERO_KG_PER_YEAR,
  PV_KWP_PER_M2,
} from './assumptions/carbon';
import { economicsFor } from './economics';
import { LPG_NCV_KWH_PER_KG } from './assumptions/economics';

const fin = (x: number | undefined, fallback = 0): number => (typeof x === 'number' && Number.isFinite(x) ? x : fallback);
const nn = (x: number | undefined): number => Math.max(0, fin(x));

// ─────────────────────────────────────────────────────────────────────────────
// Pemanas hotel yang sudah ada (cadangan di semua kasus)
// ─────────────────────────────────────────────────────────────────────────────
export interface HeaterRates {
  /** Emisi per kWh_th kalor yang dikirim pemanas [kgCO₂e/kWh_th]. */
  kgPerKWhTh: number;
  /** Bahan bakar per kWh_th (0 bila listrik) [kWh_fuel/kWh_th]. */
  fuelPerKWhTh: number;
  /** Listrik per kWh_th (0 bila LPG) [kWh_e/kWh_th]. */
  elecPerKWhTh: number;
  refId: RefIdLike;
  basis: 'lpg' | 'listrik';
}

export function heaterRates(hotel: SystemInputs['hotel'], c: SystemInputs['carbon']): HeaterRates {
  const ef = nn(c.gridKgPerKWhE);
  const eta = fin(hotel.heaterEfficiency);
  if (hotel.heater === 'lpg') {
    const fuel = 1 / (eta > 0 ? eta : LPG_BOILER_EFFICIENCY_DEFAULT);
    return { kgPerKWhTh: fuel * nn(c.lpgKgPerKWhFuel), fuelPerKWhTh: fuel, elecPerKWhTh: 0, refId: CARBON_REF.lpg, basis: 'lpg' };
  }
  const fallback = hotel.heater === 'heat-pump' ? HPWH_COP_DEFAULT : ELECTRIC_HEATER_EFFICIENCY_DEFAULT;
  const elec = 1 / (eta > 0 ? eta : fallback);
  return { kgPerKWhTh: elec * ef, fuelPerKWhTh: 0, elecPerKWhTh: elec, refId: CARBON_REF.gridEf, basis: 'listrik' };
}

const hpwhCopOf = (c: SystemInputs['carbon']): number => (fin(c.hpwhCop) > 0 ? fin(c.hpwhCop) : HPWH_COP_DEFAULT);

// ─────────────────────────────────────────────────────────────────────────────
// Aliran energi tahunan tiap kasus (dipakai bersama oleh economics.ts)
// ─────────────────────────────────────────────────────────────────────────────
export type CaseId = BaselineId | 'SV';

export interface CaseFlows {
  id: CaseId;
  /** Listrik PV (atau PV/T) yang menggantikan listrik jaringan [kWh_e/tahun]. */
  pvKWhE: number;
  /** Listrik parasit: pompa, pengendali, pompa pemulihan kondensor [kWh_e/tahun]. */
  parasiticKWhE: number;
  /** Kerja pompa kalor sumber malam/hujan (hanya SolarVein) [kWh_e/tahun]. */
  heatPumpWorkKWhE: number;
  /** Kalor yang dikirim pemanas hotel yang sudah ada [kWh_th/tahun]. */
  heaterKWhTh: number;
  /** Kalor yang dikirim HPWH (B2) [kWh_th/tahun]. */
  hpwhKWhTh: number;
  /** Emisi tertanam sepanjang umur pakai, per komponen [kgCO₂e]. */
  embodiedKg: Record<string, number>;
}

function svFlows(sys: SystemInputs, r: AnnualResult, area: number): CaseFlows {
  const c = sys.carbon;
  const installed = area > 0;
  return {
    id: 'SV',
    pvKWhE: nn(r.totals.pvKWhE),
    parasiticKWhE: nn(r.totals.parasiticKWhE),
    heatPumpWorkKWhE: nn(r.totals.heatPumpWorkKWhE),
    heaterKWhTh: nn(r.totals.dhwBackupKWhTh),
    hpwhKWhTh: 0,
    // Luas 0 = tidak ada sistem terpasang: BOS ikut nol sehingga hasilnya identik dengan B1.
    embodiedKg: installed ? { pvt: nn(c.embodiedPvtKgPerM2) * area, bos: nn(c.embodiedBosKg) } : {},
  };
}

export function caseFlows(sys: SystemInputs, b: BaselineInputs): Record<CaseId, CaseFlows> {
  const c = sys.carbon;
  const area = nn(b.areaM2);
  const demand = nn(b.dhwDemandKWhThPerYear);
  const installed = area > 0;
  const kWp = area * PV_KWP_PER_M2;
  const pvKg = kWp * nn(c.embodiedPvKgPerKWp);
  const recovered = demand * Math.min(1, nn(c.condenserRecoveryFraction));
  const sv = svFlows(sys, b.solarvein, area);
  const none = { parasiticKWhE: 0, heatPumpWorkKWhE: 0, hpwhKWhTh: 0 };
  return {
    SV: sv,
    B1: { id: 'B1', pvKWhE: 0, ...none, heaterKWhTh: demand, embodiedKg: {} },
    B2: {
      id: 'B2',
      pvKWhE: nn(b.conventionalPvKWhEPerYear),
      ...none,
      heaterKWhTh: 0,
      hpwhKWhTh: demand,
      embodiedKg: { ...(installed ? { pv: pvKg } : {}), hpwh: nn(c.embodiedHpwhKg) },
    },
    B3: {
      id: 'B3',
      pvKWhE: nn(b.pvtDhwOnly.totals.pvKWhE),
      ...none,
      parasiticKWhE: nn(b.pvtDhwOnly.totals.parasiticKWhE),
      heaterKWhTh: nn(b.pvtDhwOnly.totals.dhwBackupKWhTh),
      embodiedKg: installed ? { pvt: nn(c.embodiedPvtKgPerM2) * area, bos: nn(c.embodiedBosKg) * B3_BOS_SHARE } : {},
    },
    B4: {
      id: 'B4',
      pvKWhE: nn(b.conventionalPvKWhEPerYear),
      ...none,
      parasiticKWhE: recovered * nn(c.condenserRecoveryKWhEPerKWhTh),
      heaterKWhTh: Math.max(0, demand - recovered),
      embodiedKg: { ...(installed ? { pv: pvKg } : {}), kit: nn(c.embodiedCondenserKitKg) },
    },
  };
}

/** Emisi operasi tahunan satu kasus [kgCO₂e/tahun] (tanpa emisi tertanam, tanpa jalur desikan). */
export function operatingKg(sys: SystemInputs, f: CaseFlows): number {
  const h = heaterRates(sys.hotel, sys.carbon);
  const ef = nn(sys.carbon.gridKgPerKWhE);
  const gridKWhE = f.parasiticKWhE + f.heatPumpWorkKWhE + f.hpwhKWhTh / hpwhCopOf(sys.carbon) - f.pvKWhE;
  return f.heaterKWhTh * h.kgPerKWhTh + gridKWhE * ef;
}

/** Emisi tertanam tahunan satu kasus [kgCO₂e/tahun]. */
export function embodiedKgPerYear(sys: SystemInputs, f: CaseFlows): number {
  const life = Math.max(1, fin(sys.carbon.lifetimeYears, 20));
  return Object.values(f.embodiedKg).reduce((s, x) => s + x, 0) / life;
}

// ─────────────────────────────────────────────────────────────────────────────
// Buku besar
// ─────────────────────────────────────────────────────────────────────────────
const NAMA: Record<BaselineId, string> = {
  B1: 'hotel konvensional (B1)',
  B2: 'PV + pompa kalor (B2)',
  B3: 'PV/T hanya air panas (B3)',
  B4: 'PV + pemulihan kalor kondensor AC (B4)',
};

const EMBODIED_LABEL: Record<string, string> = {
  pvt: 'Emisi tertanam kolektor PV/T',
  bos: 'Emisi tertanam router, tangki, penukar kalor, pengendali',
  pv: 'Emisi tertanam PV standar',
  hpwh: 'Emisi tertanam pemanas pompa kalor',
  kit: 'Emisi tertanam kit pemulihan kalor kondensor',
};

function embodiedFactor(
  id: string,
  c: SystemInputs['carbon'],
  totalKg: number,
): { value: number; unit: string; refId?: RefIdLike } {
  switch (id) {
    case 'pvt':
      return { value: nn(c.embodiedPvtKgPerM2), unit: 'kgCO₂e/m²', refId: CARBON_REF.pvtEmbodied };
    case 'pv':
      return { value: nn(c.embodiedPvKgPerKWp), unit: 'kgCO₂e/kWp', refId: CARBON_REF.pvEmbodied };
    case 'bos':
      return { value: totalKg, unit: 'kgCO₂e (total umur pakai)', refId: CARBON_REF.bosEmbodied };
    default:
      return { value: totalKg, unit: 'kgCO₂e (total umur pakai)', refId: CARBON_REF.condenser };
  }
}

export function ledgerFor(sys: SystemInputs, b: BaselineInputs, id: BaselineId): CarbonLedger {
  const c = sys.carbon;
  const flows = caseFlows(sys, b);
  const sv = flows.SV;
  const x = flows[id];
  const ef = nn(c.gridKgPerKWhE);
  const h = heaterRates(sys.hotel, c);
  const life = Math.max(1, fin(c.lifetimeYears, 20));
  const demand = nn(b.dhwDemandKWhThPerYear);
  const rows: LedgerRow[] = [];

  // 1) Listrik PV (atau PV/T) — selisih listrik yang menggantikan jaringan.
  const dPv = sv.pvKWhE - x.pvKWhE;
  rows.push({
    id: 'listrik-pv',
    label: id === 'B1' ? 'Listrik PV/T menggantikan listrik jaringan' : 'Selisih listrik PV/T terhadap pembanding',
    kind: 'avoided',
    kgPerYear: dPv * ef,
    energy: { kWhE: kWhE(dPv) },
    factor: { value: ef, unit: 'kgCO₂e/kWh_e', refId: CARBON_REF.gridEf },
    tag: 'simulasi',
  });

  // 2) Kalor air panas.
  if (id === 'B2') {
    // B2 melayani SELURUH kebutuhan dengan listrik pompa kalor (HPWH); SolarVein memakai kalor surya + cadangan pemanas hotel.
    // Selisih = D·(EF/COP) − cadangan_SV·f_pemanas. Pada tutupan surya penuh ini = D·EF/COP (kredit per kWh_th = EF/COP).
    const fHp = ef / hpwhCopOf(c);
    rows.push({
      id: 'kalor-air-panas',
      label: `Selisih air panas (kalor surya + cadangan ${h.basis === 'lpg' ? 'LPG' : 'listrik'} dibanding listrik pompa kalor B2)`,
      kind: 'avoided',
      kgPerYear: demand * fHp - sv.heaterKWhTh * h.kgPerKWhTh,
      energy: {
        kWhTh: kWhTh(demand),
        kWhE: kWhE(demand / hpwhCopOf(c)), // listrik HPWH B2
        ...(h.basis === 'lpg' ? { kWhFuel: kWhFuel(sv.heaterKWhTh * h.fuelPerKWhTh) } : {}), // bahan bakar cadangan SolarVein
      },
      factor: { value: fHp, unit: 'kgCO₂e/kWh_th (listrik HPWH = EF/COP)', refId: CARBON_REF.hpwhCop },
      tag: 'simulasi',
    });
  } else {
    const dHeat = x.heaterKWhTh - sv.heaterKWhTh;
    rows.push({
      id: 'kalor-air-panas',
      label:
        id === 'B3'
          ? 'Selisih kalor surya terhadap PV/T hanya air panas'
          : id === 'B4'
            ? 'Selisih kalor surya terhadap pemulihan kondensor'
            : 'Kalor surya menggantikan pemanas hotel',
      kind: 'avoided',
      kgPerYear: dHeat * h.kgPerKWhTh,
      energy: {
        kWhTh: kWhTh(dHeat),
        ...(h.basis === 'lpg' ? { kWhFuel: kWhFuel(dHeat * h.fuelPerKWhTh) } : { kWhE: kWhE(dHeat * h.elecPerKWhTh) }),
      },
      factor: { value: h.kgPerKWhTh, unit: 'kgCO₂e/kWh_th', refId: h.refId },
      tag: 'simulasi',
    });
  }

  // 3) Listrik parasit (pompa, pengendali; B4: pompa pemulihan kondensor) dan kerja pompa kalor sumber.
  const dPar = x.parasiticKWhE - sv.parasiticKWhE;
  rows.push({
    id: 'parasit',
    label: 'Listrik parasit (pompa, pengendali)',
    kind: 'parasitic',
    kgPerYear: dPar * ef,
    energy: { kWhE: kWhE(dPar) },
    factor: { value: ef, unit: 'kgCO₂e/kWh_e', refId: CARBON_REF.gridEf },
    tag: 'simulasi',
  });
  if (sys.heatPumpSource.enabled || sv.heatPumpWorkKWhE > 0) {
    rows.push({
      id: 'pompa-kalor-sumber',
      label: 'Kerja pompa kalor sumber malam/hujan',
      kind: 'parasitic',
      kgPerYear: -sv.heatPumpWorkKWhE * ef,
      energy: { kWhE: kWhE(-sv.heatPumpWorkKWhE) },
      factor: { value: ef, unit: 'kgCO₂e/kWh_e', refId: CARBON_REF.gridEf },
      tag: 'hipotesis',
    });
  }

  // 4) Emisi tertanam: selisih per komponen, dibagi umur pakai.
  for (const comp of ['pvt', 'bos', 'pv', 'hpwh', 'kit']) {
    const xe = x.embodiedKg[comp] ?? 0;
    const se = sv.embodiedKg[comp] ?? 0;
    if (xe === 0 && se === 0) continue;
    const diff = (xe - se) / life;
    if (diff === 0) continue;
    rows.push({
      id: `tertanam-${comp}`,
      label: EMBODIED_LABEL[comp] ?? comp,
      kind: 'embodied',
      kgPerYear: diff,
      factor: embodiedFactor(comp, c, Math.max(xe, se)),
      tag: 'asumsi',
      refId: embodiedFactor(comp, c, 0).refId,
    });
  }

  // 5) Rugi diam tangki: informasi saja. Sudah ada di dalam energi surya terpakai (dhwSolar) dan beban cadangan,
  //    jadi tidak dihitung dua kali (kgPerYear = 0 secara sengaja).
  rows.push({
    id: 'rugi-diam',
    label: 'Rugi diam tangki (sudah termasuk dalam kalor surya terpakai)',
    kind: 'standby',
    kgPerYear: 0,
    energy: { kWhTh: kWhTh(nn(b.solarvein.totals.tankLossKWhTh)) },
    factor: { value: 0, unit: 'kgCO₂e (tidak dihitung ulang)' },
    tag: 'simulasi',
  });

  // 6) Jalur desikan: hipotesis riset, di luar angka utama.
  const hvac = fin(b.solarvein.totals.hvacSavedKWhE);
  if (sys.desiccant.enabled || hvac !== 0) {
    rows.push({
      id: 'desikan-hvac',
      label: 'Hemat listrik AC dari jalur desikan (hipotesis riset)',
      kind: 'avoided',
      kgPerYear: hvac * ef,
      energy: { kWhE: kWhE(hvac) },
      factor: { value: ef, unit: 'kgCO₂e/kWh_e', refId: CARBON_REF.gridEf },
      tag: 'hipotesis',
      excludedFromHeadline: true,
    });
  }
  if (sys.desiccant.enabled && nn(b.areaM2) > 0) {
    rows.push({
      id: 'desikan-tertanam',
      label: 'Emisi tertanam unit desikan (hipotesis riset)',
      kind: 'embodied',
      kgPerYear: -nn(c.embodiedDesiccantKg) / life,
      factor: { value: nn(c.embodiedDesiccantKg), unit: 'kgCO₂e (total umur pakai)' },
      tag: 'asumsi',
      excludedFromHeadline: true,
    });
  }

  return finalize(id, rows, life);
}

function finalize(id: BaselineId, rows: LedgerRow[], life: number): CarbonLedger {
  const head = rows.filter((r) => !r.excludedFromHeadline);
  const sumKind = (k: LedgerRow['kind']) => head.filter((r) => r.kind === k).reduce((s, r) => s + fin(r.kgPerYear), 0);
  const gross = sumKind('avoided');
  const embodiedPenalty = -sumKind('embodied'); // + = SolarVein menambah emisi tertanam
  const parasiticPenalty = -sumKind('parasitic');
  const net = head.reduce((s, r) => s + fin(r.kgPerYear), 0);
  // Pembayaran balik: emisi tertanam inkremental sepanjang umur / manfaat operasi tahunan (net sebelum biaya tertanam).
  // Bila net ≤ 0 SolarVein tidak pernah menutup emisi tertanamnya terhadap pembanding ini.
  const incrementalLifetime = Math.max(0, embodiedPenalty * life);
  const operating = net + embodiedPenalty;
  const payback = net > 0 && operating > 0 ? incrementalLifetime / operating : Infinity;
  return {
    baselineId: id,
    rows,
    grossAvoidedKgPerYear: gross,
    embodiedKgPerYear: embodiedPenalty,
    parasiticKgPerYear: parasiticPenalty,
    netKgPerYear: net,
    carbonPaybackYears: payback,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Kalimat vonis (dibangkitkan dari angka, tanpa pemenang bawaan)
// ─────────────────────────────────────────────────────────────────────────────
const fmt = (x: number, digits: number): string => x.toFixed(digits).replace('.', ',');
/** Ton CO₂e dengan koma desimal; pembulatan menurut besaran. */
const fmtTon = (kg: number): string => {
  const t = Math.abs(kg) / 1000;
  return fmt(t, t >= 10 ? 1 : 2);
};
const lcFirst = (s: string): string => (s.length > 1 && s[1] === s[1]?.toLowerCase() ? s[0]!.toLowerCase() + s.slice(1) : s);

function dominantRow(l: CarbonLedger, sign: 1 | -1): LedgerRow | undefined {
  let best: LedgerRow | undefined;
  for (const r of l.rows) {
    if (r.excludedFromHeadline || r.kgPerYear * sign <= 0) continue;
    if (!best || r.kgPerYear * sign > best.kgPerYear * sign) best = r;
  }
  return best;
}

/**
 * Pecahan pemulihan kondensor (B4) di mana net terhadap B4 = 0 (impas). Net linear terhadap pecahan
 * (emisi tertanam kit tetap), jadi dihitung dari dua evaluasi. Mengembalikan null bila tidak ada impas di [0, 1]
 * (SolarVein unggul walau tanpa pemulihan, B4 tetap kalah walau menutup seluruhnya, atau net tidak bergantung pada pecahan).
 */
export function b4BreakEvenFraction(sys: SystemInputs, b: BaselineInputs): number | null {
  const at = (f: number): number =>
    ledgerFor({ ...sys, carbon: { ...sys.carbon, condenserRecoveryFraction: f } }, b, 'B4').netKgPerYear;
  const n0 = at(0);
  const n1 = at(1);
  const slope = n1 - n0;
  if (!(Math.abs(slope) > 1e-9)) return null;
  const f = -n0 / slope;
  return f >= 0 && f <= 1 && Number.isFinite(f) ? f : null;
}

const fmtJuta = (idr: number): string => `Rp${fmt(Math.abs(idr) / 1e6, 1)} juta`;

/** Arah karbon dan uang bertolak belakang? (+1 = SolarVein lebih baik, −1 = pembanding lebih baik, 0 = hampir sama). */
function dirOf(x: number, eps: number): -1 | 0 | 1 {
  return x > eps ? 1 : x < -eps ? -1 : 0;
}

/**
 * Kalimat vonis dari angka (tanpa pemenang bawaan). Urutan: B2 sebagai pembanding utama yang jujur, B1 sebagai konteks,
 * lalu B3 dan B4 (dengan titik impas pemulihan kondensor). Bila karbon dan uang menunjuk arah berlawanan, dinyatakan eksplisit.
 */
export function verdictFor(
  sys: SystemInputs,
  ledgers: Record<BaselineId, CarbonLedger>,
  economics: BaselineComparison['economics'],
  b: BaselineInputs,
): string {
  const h = heaterRates(sys.hotel, sys.carbon);
  const clause = (id: BaselineId, prefix: string): string => {
    const l = ledgers[id];
    const net = fin(l.netKgPerYear);
    let t: string;
    if (Math.abs(net) < NEAR_ZERO_KG_PER_YEAR) {
      t = `${prefix}selisih CO₂e hampir nol (di bawah ${fmt(NEAR_ZERO_KG_PER_YEAR, 0)} kg/tahun)`;
    } else if (net > 0) {
      const why = dominantRow(l, 1);
      t = `${prefix}SolarVein menghindari ~${fmtTon(net)} t CO₂e/tahun` + (why ? `, terutama dari ${lcFirst(why.label)}` : '');
    } else {
      const why = dominantRow(l, -1);
      t = `${prefix}${id} lebih unggul ~${fmtTon(net)} t CO₂e/tahun` + (why ? `, terutama karena ${lcFirst(why.label)}` : '');
    }
    // Karbon vs uang: bila berlawanan, katakan.
    const saving = fin(economics[id].annualSavingIdr);
    const cDir = dirOf(net, NEAR_ZERO_KG_PER_YEAR);
    const mDir = dirOf(saving, 1_000);
    if (cDir !== 0 && mDir !== 0 && cDir !== mDir) {
      if (cDir > 0) {
        let cause = '';
        if (id === 'B2' && h.basis === 'lpg') {
          const lpgCost = (fin(sys.economics.lpgPriceIdrPerKg) / LPG_NCV_KWH_PER_KG) * h.fuelPerKWhTh;
          const hpCost = fin(sys.economics.gridTariffIdrPerKWh) / hpwhCopOf(sys.carbon);
          if (lpgCost > hpCost) cause = ', karena cadangan LPG lebih mahal per kWh_th daripada listrik pompa kalor';
        }
        t += `. Namun secara biaya arahnya berlawanan: biaya tahunan SolarVein lebih tinggi ~${fmtJuta(saving)} dibanding ${NAMA[id]}${cause}, sehingga tidak balik modal`;
      } else {
        t += `. Namun secara biaya arahnya berlawanan: SolarVein lebih murah ~${fmtJuta(saving)}/tahun dibanding ${NAMA[id]} walau emisinya lebih tinggi`;
      }
    }
    return t;
  };

  const parts: string[] = [];
  parts.push(clause('B2', `Pembanding utama ${NAMA.B2}: `));
  parts.push(clause('B1', `Sebagai konteks, dibanding ${NAMA.B1}, `));
  parts.push(clause('B3', `Dibanding ${NAMA.B3}, `));
  let b4 = clause('B4', `Dibanding ${NAMA.B4}, `);
  const f0 = Math.min(1, nn(sys.carbon.condenserRecoveryFraction));
  const fStar = b4BreakEvenFraction(sys, b);
  if (fStar !== null) {
    b4 += `. Titik impas B4: pemulihan kondensor menutup ~${fmt(fStar * 100, 0)} % kebutuhan air panas (asumsi ${fmt(f0 * 100, 0)} %)`;
  } else {
    b4 += `. Tidak ada titik impas B4 pada pemulihan 0–100 % kebutuhan air panas`;
  }
  parts.push(b4);
  let s = parts.join('. ') + '.';
  if (sys.desiccant.enabled) s += ' Jalur desikan (hipotesis riset) tidak dihitung dalam angka ini.';
  return s;
}

// ─────────────────────────────────────────────────────────────────────────────
// API publik
// ─────────────────────────────────────────────────────────────────────────────
export function compareBaselines(sys: SystemInputs, b: BaselineInputs): BaselineComparison {
  const ids: BaselineId[] = ['B1', 'B2', 'B3', 'B4'];
  const ledgers = {} as Record<BaselineId, CarbonLedger>;
  const economics = {} as BaselineComparison['economics'];
  for (const id of ids) {
    ledgers[id] = ledgerFor(sys, b, id);
    economics[id] = economicsFor(sys, ledgers[id], b);
  }
  // Baris desikan tidak pernah masuk net; kalimat menyebut pengecualiannya hanya bila jalur desikan aktif.
  return { ledgers, economics, verdict: verdictFor(sys, ledgers, economics, b), b4BreakEvenFraction: b4BreakEvenFraction(sys, b) };
}

/**
 * Nilai tiap cara memakai 1 kWh_th kalor hasil panen [kgCO₂e yang dihindari per kWh_th], diurutkan menurun.
 * `pvGainWePerWth` = tambahan daya listrik PV [W_e] per W_th kalor yang tidak diambil (sel lebih dingin).
 */
export function heatUseValues(
  sys: SystemInputs,
  x: { desiccant: DesiccantEval; pvGainWePerWth: number },
): HeatUseValue[] {
  const c = sys.carbon;
  const ef = nn(c.gridKgPerKWhE);
  const lpgEta = sys.hotel.heater === 'lpg' && fin(sys.hotel.heaterEfficiency) > 0 ? fin(sys.hotel.heaterEfficiency) : LPG_BOILER_EFFICIENCY_DEFAULT;
  const elecEta =
    sys.hotel.heater === 'electric-resistance' && fin(sys.hotel.heaterEfficiency) > 0
      ? fin(sys.hotel.heaterEfficiency)
      : ELECTRIC_HEATER_EFFICIENCY_DEFAULT;
  const regen = fin(x.desiccant.regenHeatW);
  const desiccantKg = regen > 0 ? (fin(x.desiccant.hvac.netSavingWe) / regen) * ef : 0;
  const out: HeatUseValue[] = [
    {
      use: 'dhw-lpg',
      label: 'Air panas, menggantikan pemanas LPG',
      kgPerKWhTh: nn(c.lpgKgPerKWhFuel) / lpgEta,
      note: `Bahan bakar LPG dihemat 1/η per kWh_th (η ${fmt(lpgEta, 2)}), dikali faktor emisi LPG.`,
      tag: 'terbit',
    },
    {
      use: 'dhw-heat-pump',
      label: 'Air panas, menggantikan pemanas pompa kalor',
      kgPerKWhTh: ef / hpwhCopOf(c),
      note: `Listrik dihemat 1/COP per kWh_th (COP ${fmt(hpwhCopOf(c), 1)}), dikali faktor emisi jaringan.`,
      tag: 'asumsi',
    },
    {
      use: 'dhw-electric',
      label: 'Air panas, menggantikan pemanas tahanan listrik',
      kgPerKWhTh: ef / elecEta,
      note: 'Listrik dihemat 1/η per kWh_th, dikali faktor emisi jaringan.',
      tag: 'mapan',
    },
    {
      use: 'desiccant',
      label: 'Regenerasi desikan (hipotesis riset)',
      kgPerKWhTh: desiccantKg,
      note: 'Hemat listrik AC bersih per kWh_th kalor regenerasi (sudah dikurangi after-cooler, kipas, pompa, dan penalti PV). Bisa nol atau negatif.',
      tag: 'hipotesis',
    },
    {
      use: 'pv-lebih-dingin',
      label: 'Ambil kalor lebih sedikit, sel PV lebih dingin',
      kgPerKWhTh: nn(x.pvGainWePerWth) * ef,
      note: 'Listrik PV tambahan per kWh_th kalor yang tidak diambil, dikali faktor emisi jaringan.',
      tag: 'simulasi',
    },
  ];
  return out.map((v) => ({ ...v, kgPerKWhTh: fin(v.kgPerKWhTh) })).sort((a, b) => b.kgPerKWhTh - a.kgPerKWhTh);
}
