/**
 * Asumsi ekonomi SolarVein v2 (modul `economics.ts`). Semua dalam rupiah (IDR), rentang rendah / tengah / tinggi.
 * Angka bertanda TODO(R0) menunggu harga pasar tertaut sumber dari tim referensi.
 */
import type { AssumptionEntry, EconomicParams } from '../contract';

type Range3 = [number, number, number];

/** Nilai kalor bawah LPG [kWh/kg] (46 MJ/kg). TODO(R0). */
export const LPG_NCV_KWH_PER_KG = 12.8;

/** Biaya pasang PV standar [IDR/kWp] (pembanding B2, B4). TODO(R0). */
export const PV_CAPEX_IDR_PER_KWP: Range3 = [10_000_000, 13_000_000, 17_000_000];
/** Pemanas air pompa kalor B2 [IDR per kW_th kapasitas]. TODO(R0). */
export const HPWH_CAPEX_IDR_PER_KW_TH: Range3 = [6_000_000, 10_000_000, 15_000_000];
/** Kit pemulihan kalor kondensor B4 [IDR per kW_th kapasitas]. TODO(R0). */
export const CONDENSER_KIT_CAPEX_IDR_PER_KW_TH: Range3 = [3_000_000, 5_000_000, 8_000_000];
/** Jam operasi setara per hari untuk mengubah kebutuhan air panas tahunan menjadi kapasitas termal [jam/hari]. */
export const DHW_SIZING_HOURS_PER_DAY = 8;
/** Porsi capex BOS yang tetap diperlukan B3 (selaras dengan B3_BOS_SHARE pada karbon). */
export const B3_BOS_CAPEX_SHARE = 0.85;

export const DEFAULT_ECONOMIC_PARAMS: EconomicParams = {
  gridTariffIdrPerKWh: 1450,
  lpgPriceIdrPerKg: 16_000,
  capexPvtIdrPerM2: [3_500_000, 5_000_000, 7_000_000],
  capexBosIdr: [60_000_000, 100_000_000, 160_000_000],
  capexDesiccantIdr: [150_000_000, 300_000_000, 500_000_000],
  omFractionPerYear: 0.015,
};

export const ECONOMICS_ASSUMPTIONS: AssumptionEntry[] = [
  {
    id: 'econ-tariff',
    title: 'Tarif listrik dan harga LPG',
    body: 'Tarif golongan bisnis dan harga LPG nonsubsidi per kg. Penghematan dihitung dari selisih energi tahunan terhadap setiap pembanding. Menunggu sumber tertaut dari R0.',
    value: 'Rp1.450/kWh_e; Rp16.000/kg LPG',
    tag: 'asumsi',
  },
  {
    id: 'econ-lpg-ncv',
    title: 'Nilai kalor LPG',
    body: 'Mengubah kWh bahan bakar menjadi kg LPG untuk biaya.',
    value: '12,8 kWh/kg (46 MJ/kg)',
    tag: 'terbit',
  },
  {
    id: 'econ-capex',
    title: 'Biaya investasi',
    body: 'Rentang rendah/tengah/tinggi untuk kolektor PV/T per m², BOS dan, bila dihitung, unit desikan. Investasi dilaporkan sebagai tambahan terhadap pembanding: biaya pembanding (PV standar, pemanas pompa kalor, kit kondensor) dikurangkan. Unit desikan tidak dihitung secara bawaan karena manfaatnya tidak masuk angka utama.',
    value: 'PV/T Rp3,5–7 juta/m²; BOS Rp60–160 juta',
    tag: 'asumsi',
  },
  {
    id: 'econ-om',
    title: 'Operasi dan perawatan',
    body: 'Pecahan tahunan dari investasi tambahan, dikurangkan dari penghematan energi.',
    value: '1,5 % per tahun',
    tag: 'asumsi',
  },
  {
    id: 'econ-payback',
    title: 'Balik modal sederhana',
    body: 'Investasi tambahan dibagi penghematan tahunan, tanpa diskonto dan tanpa kenaikan tarif. Bila penghematan nol atau negatif, balik modal dinyatakan tidak tercapai.',
    tag: 'asumsi',
  },
];
