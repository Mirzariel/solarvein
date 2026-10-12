import type { SimInputs } from './types';

/** Kunci input bertipe angka pada SimInputs. */
export type NumericInputKey = {
  [K in keyof SimInputs]: SimInputs[K] extends number ? K : never;
}[keyof SimInputs];

/**
 * Skenario "Cerah" (siang tropis, beban air panas ada, tidak ada sumber panas yang perlu dibuang).
 * T_in 40 °C: balik loop pemanas air (DHW preheat) yang realistis; 30 °C terlalu menguntungkan.
 */
const SUNNY: SimInputs = {
  irradiance: 900,
  ambientC: 32,
  rainMmH: 0,
  windMs: 1.5,
  inletC: 40,
  flowLpm: 2,
  areaM2: 1.7,
  uPlateFluid: 150,
  pressureDropKPa: 20,
  pumpEfficiency: 0.3,
  pumpControl: 'auto',
  etaRef: 0.2,
  betaPerK: 0.0035,
  heatLoadAvailable: true,
  hotSourceAvailable: false,
  boilerEfficiency: 0.85,
  coolingCOP: 30, // same displaced-cooling baseline (fan-driven dry cooler) as the rainy preset
};

/**
 * Skenario "Hujan" (mendung, hujan deras, loop proses hangat perlu didinginkan).
 * COP 30 = dry cooler/kipas saja (acuan realistis untuk loop ±20 K di atas udara sekitar), BUKAN chiller (3–4).
 */
const RAINY: SimInputs = {
  ...SUNNY,
  irradiance: 120,
  ambientC: 25,
  rainMmH: 15,
  windMs: 3,
  inletC: 45,
  flowLpm: 3,
  heatLoadAvailable: false,
  hotSourceAvailable: true,
  coolingCOP: 30,
};

export const DEFAULT_INPUTS: SimInputs = { ...SUNNY };

export const PRESETS: Record<'sunny' | 'rainy', SimInputs> = {
  sunny: { ...SUNNY },
  rainy: { ...RAINY },
};

export const INPUT_LIMITS: Record<
  NumericInputKey,
  { min: number; max: number; step: number; unit: string; label: string; help: string }
> = {
  irradiance: {
    min: 0, max: 1200, step: 10, unit: 'W/m²', label: 'Irradiansi (G)',
    help: 'Daya radiasi matahari yang jatuh pada bidang panel. Siang cerah di Indonesia ±800–1000 W/m²; mendung tebal <200 W/m².',
  },
  ambientC: {
    min: 10, max: 45, step: 0.5, unit: '°C', label: 'Suhu udara sekitar',
    help: 'Suhu udara di sekitar panel. Menentukan rugi panas dari permukaan depan dan belakang panel.',
  },
  rainMmH: {
    min: 0, max: 60, step: 1, unit: 'mm/jam', label: 'Intensitas hujan',
    help: 'Laju curah hujan. Tetes hujan yang lebih dingin membawa panas dari permukaan panel; 0 berarti kering. Hujan lebat sekitar 10–50 mm/jam.',
  },
  windMs: {
    min: 0, max: 10, step: 0.1, unit: 'm/s', label: 'Kecepatan angin',
    help: 'Angin pada permukaan panel. Semakin kencang, semakin besar pelepasan panas secara konveksi.',
  },
  inletC: {
    min: 10, max: 80, step: 0.5, unit: '°C', label: 'Suhu cairan masuk',
    help: 'Suhu cairan yang masuk ke penukar panas di belakang panel (balik dari beban air panas atau dari loop proses hangat).',
  },
  flowLpm: {
    min: 0.3, max: 10, step: 0.1, unit: 'L/mnt', label: 'Debit cairan',
    help: 'Debit air dalam loop. Debit besar menjaga selisih suhu kecil tetapi membuat daya pompa naik cepat (≈ kuadrat debit).',
  },
  areaM2: {
    min: 0.5, max: 4, step: 0.1, unit: 'm²', label: 'Luas apertur panel',
    help: 'Luas efektif panel yang menerima cahaya. Satu modul PVT rumah tangga sekitar 1,6–2 m².',
  },
  uPlateFluid: {
    min: 30, max: 600, step: 10, unit: 'W/(m²·K)', label: 'Konduktansi pelat–cairan',
    help: 'Seberapa baik panas berpindah antara pelat penyerap dan cairan, per m² panel. Makin besar, makin efektif penukar panas (NTU naik).',
  },
  pressureDropKPa: {
    min: 2, max: 80, step: 1, unit: 'kPa', label: 'Rugi tekan loop @ 2 L/mnt',
    help: 'Rugi tekan hidrolik loop pada debit acuan 2 L/mnt; pada debit lain diskalakan dengan kuadrat debit. Menentukan daya pompa.',
  },
  pumpEfficiency: {
    min: 0.1, max: 0.6, step: 0.01, unit: '–', label: 'Efisiensi pompa',
    help: 'Efisiensi listrik-ke-hidrolik pompa sirkulasi kecil (umumnya 0,2–0,4).',
  },
  etaRef: {
    min: 0.15, max: 0.24, step: 0.005, unit: '–', label: 'Efisiensi PV acuan (STC)',
    help: 'Efisiensi listrik modul PV pada 25 °C sel dan 1000 W/m². Modul silikon kristalin modern 0,18–0,22.',
  },
  betaPerK: {
    min: 0.0025, max: 0.005, step: 0.0001, unit: '1/K', label: 'Koefisien suhu daya (β)',
    help: 'Penurunan daya PV per kenaikan 1 K suhu sel. Silikon kristalin ≈ 0,35–0,45 %/K (0,0035–0,0045).',
  },
  boilerEfficiency: {
    min: 0.5, max: 1, step: 0.01, unit: '–', label: 'Efisiensi pemanas pengganti',
    help: 'Efisiensi pemanas bahan bakar (mis. LPG) yang digantikan oleh panas hasil panen. Menentukan energi bahan bakar yang dihemat.',
  },
  coolingCOP: {
    min: 1, max: 60, step: 0.5, unit: '–', label: 'COP pendingin pengganti',
    help: 'Berapa W panas yang dibuang per 1 W listrik oleh peralatan pendingin yang digantikan. Pilih sesuai pembandingnya: dry cooler (kipas saja) ≈ 20–40, menara pendingin (kipas + pompa) ≈ 15–30, chiller kecil ≈ 3–4. Untuk loop hanya ±20 K di atas udara sekitar, dry cooler adalah pembanding yang paling realistis.',
  },
};
