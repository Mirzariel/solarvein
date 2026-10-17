/**
 * Asumsi karbon SolarVein v2 (modul `carbon.ts`). Semua dapat diubah pengguna lewat CarbonParams.
 * Angka bertanda TODO(R0) menunggu sumber terbit dari tim referensi (R0); refId di bawah masih penampung.
 */
import type { AssumptionEntry, CarbonParams } from '../contract';

/** Penampung refId — diganti dengan id `src/sim/references.ts` setelah R0 digabung. */
export const CARBON_REF = {
  gridEf: 'esdm-grid-ef', // TODO(R0): faktor emisi grid ESDM/DJK terbaru (tahun & wilayah)
  lpg: 'ipcc2006-lpg', // TODO(R0): IPCC 2006 Vol.2 Tabel 1.4 (63,1 t/TJ NCV)
  pvEmbodied: 'pv-embodied', // TODO(R0): LCA modul PV (mis. IEA PVPS Task 12)
  pvtEmbodied: 'pvt-embodied', // TODO(R0): LCA kolektor PV/T cair
  hpwhCop: 'hpwh-cop', // TODO(R0): COP pemanas air pompa kalor tropis
  bosEmbodied: 'bos-embodied', // TODO(R0)
  condenser: 'ac-condenser-recovery', // TODO(R0)
} as const;

/** Daya puncak PV per luas modul [kWp/m²]. Asumsi eksplisit: modul silikon ±200 W/m² (efisiensi ±20 %). */
export const PV_KWP_PER_M2 = 0.2;

/**
 * B3 memakai PV/T yang sama tetapi tanpa katup/jalur desikan dan pengatur adaptif: porsi emisi tertanam
 * perangkat BOS (router, tangki, penukar kalor, pengendali) yang tetap diperlukan. Asumsi, TODO(R0).
 */
export const B3_BOS_SHARE = 0.85;

/** Efisiensi pemanas LPG bila pemanas hotel bukan LPG (dipakai hanya untuk nilai "dhw-lpg" di perbandingan). */
export const LPG_BOILER_EFFICIENCY_DEFAULT = 0.85;
/** Efisiensi pemanas tahanan listrik. */
export const ELECTRIC_HEATER_EFFICIENCY_DEFAULT = 1.0;
/** COP bawaan bila masukan tidak valid. */
export const HPWH_COP_DEFAULT = 3.5;

/** Selisih bersih di bawah ini [kgCO₂e/tahun] dianggap "hampir sama" pada kalimat vonis. */
export const NEAR_ZERO_KG_PER_YEAR = 25;

export const DEFAULT_CARBON_PARAMS: CarbonParams = {
  gridKgPerKWhE: 0.8,
  lpgKgPerKWhFuel: 0.227,
  hpwhCop: 3.5,
  coilRefCop: 3.0,
  // Sensible-only after-cooler can run its evaporator ~8–10 K warmer than a dehumidifying coil (~3 %/K)
  // → COP ratio ≈ 1,3. Optimistic ratios (≥ 1,6) flatter the desiccant; keep conservative (asumsi, council P0-1).
  aftercoolerCop: 3.9,
  embodiedPvtKgPerM2: 300,
  embodiedPvKgPerKWp: 1000,
  // hotel scale: ~5 m³ insulated steel buffer tank + HX + valves + piping + controller (asumsi, R0/council to review)
  embodiedBosKg: 2000,
  embodiedDesiccantKg: 400,
  condenserRecoveryFraction: 0.35,
  condenserRecoveryKWhEPerKWhTh: 0.03,
  embodiedCondenserKitKg: 150,
  embodiedHpwhKg: 500,
  lifetimeYears: 20,
};

export const CARBON_ASSUMPTIONS: AssumptionEntry[] = [
  {
    id: 'carbon-grid-ef',
    title: 'Faktor emisi listrik jaringan',
    body: 'Dipakai untuk semua listrik yang dibeli atau dihindari. Tidak ada faktor emisi per jam untuk Indonesia, jadi nilainya sama sepanjang hari. Angka tahun dan wilayah menunggu verifikasi R0.',
    value: '0,8 kgCO₂e/kWh_e (rentang 0,7–0,9)',
    tag: 'terbit',
    refId: CARBON_REF.gridEf,
  },
  {
    id: 'carbon-lpg',
    title: 'Faktor emisi LPG',
    body: 'Emisi pembakaran per energi bahan bakar (nilai kalor bawah), dibagi efisiensi pemanas untuk mendapat emisi per kWh_th air panas.',
    value: '0,227 kgCO₂e/kWh_bahan bakar (63,1 t/TJ)',
    tag: 'terbit',
    refId: CARBON_REF.lpg,
  },
  {
    id: 'carbon-hpwh-cop',
    title: 'COP pemanas air pompa kalor (B2)',
    body: 'COP musiman pompa kalor air panas di iklim tropis. Pemanas B2 menggantikan seluruh kebutuhan air panas.',
    value: '3,5 (rentang 3–4)',
    tag: 'asumsi',
    refId: CARBON_REF.hpwhCop,
  },
  {
    id: 'carbon-pv-density',
    title: 'Daya PV per luas atap',
    body: 'PV standar (B2 dan B4) dipasang pada luas atap yang sama dengan kolektor. Daya puncaknya dihitung dari luas dikali kepadatan daya agar emisi tertanamnya dapat diskalakan per kWp.',
    value: '0,2 kWp/m²',
    tag: 'asumsi',
    refId: CARBON_REF.pvEmbodied,
  },
  {
    id: 'carbon-embodied',
    title: 'Emisi tertanam peralatan',
    body: 'Dibagi umur pakai (20 tahun) dan dibebankan setiap tahun. Tidak pernah nol: kolektor PV/T per m², BOS (router, tangki, penukar kalor, pengendali), PV standar per kWp, pemanas pompa kalor dan kit pemulihan kondensor. Pemanas dan AC hotel yang sudah ada sama di semua kasus sehingga tidak dihitung.',
    value: 'PV/T 300 kg/m²; PV 1.000 kg/kWp; BOS 2.000 kg',
    tag: 'asumsi',
    refId: CARBON_REF.pvtEmbodied,
  },
  {
    id: 'carbon-b3-bos',
    title: 'BOS pembanding B3',
    body: 'B3 memakai kolektor yang sama tanpa jalur desikan dan pengatur adaptif, sehingga emisi tertanam BOS-nya diambil sebagian dari BOS SolarVein.',
    value: '85 % dari BOS SolarVein',
    tag: 'asumsi',
    refId: CARBON_REF.bosEmbodied,
  },
  {
    id: 'carbon-b4',
    title: 'Pemulihan kalor kondensor AC (B4)',
    body: 'Kalor kondensor mengikuti beban pendinginan, bukan kebutuhan air panas, sehingga hanya sebagian kebutuhan air panas yang tertutup. Pompa pemulihan menambah listrik kecil per kWh_th yang dipulihkan.',
    value: '35 % kebutuhan air panas; 0,03 kWh_e/kWh_th',
    tag: 'asumsi',
    refId: CARBON_REF.condenser,
  },
  {
    id: 'carbon-scope',
    title: 'Batas perhitungan',
    body: 'Layanan sama di semua kasus: air panas pada suhu tuang yang sama, kebutuhan listrik sama, kelembapan ruang sama. Listrik PV dianggap terpakai sendiri sepenuhnya oleh hotel sehingga menggantikan listrik jaringan. Rugi diam tangki sudah ada di dalam energi surya terpakai dan tidak dihitung dua kali. Jalur desikan tidak masuk angka utama.',
    tag: 'asumsi',
  },
];
