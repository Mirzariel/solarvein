import type { CarbonAssumptions, CarbonResult, SimResult } from './types';

/**
 * Asumsi karbon bawaan (semuanya dapat diubah pengguna).
 *  - Faktor emisi grid Indonesia ≈ 0,8 kgCO2e/kWh (kisaran publikasi 0,75–0,9; bergantung tahun & wilayah).
 *  - LPG ≈ 0,23 kgCO2e/kWh bahan bakar (±63 kg CO2/GJ nilai kalor bawah).
 *  - 1400 jam setara beban penuh per tahun (iklim tropis, irradiansi tahunan rata-rata ±1400–1600 kWh/m²).
 *  - Emisi tertanam unit PVT ±1,7 m² ≈ 450 kgCO2e (kisaran 400–600: modul PV, tembaga/aluminium, insulasi, pompa).
 *  - Emisi tertanam TAMBAHAN (penukar panas + insulasi + pompa + kontrol) ≈ 180 kgCO2e (kisaran 100–250),
 *    dipakai pada pembayaran balik inkremental terhadap PV konvensional.
 *  - Pendinginan yang digantikan TIDAK dihitung secara bawaan (perlu dinyatakan eksplisit).
 *
 * KETERGANTUNGAN SKENARIO: hoursPerYear = jam setara beban penuh untuk kondisi yang sedang dipakai.
 * 1400 jam/tahun wajar untuk snapshot "cerah". Snapshot "hujan deras" (±15 mm/jam) hanya terjadi ±120–250 jam/tahun
 * (15 mm/jam × 1400 jam = 21 m hujan/tahun, jauh di atas curah hujan tahunan ±2 m), jadi untuk skenario hujan
 * gunakan ≈ 120–250 jam. Lihat CARBON_HOURS_GUIDANCE.
 */
export const DEFAULT_CARBON: CarbonAssumptions = {
  gridKgPerKWh: 0.8,
  fuelKgPerKWh: 0.23,
  hoursPerYear: 1400,
  embodiedKg: 450,
  coolingDisplacementModeled: false,
  incrementalEmbodiedKg: 180,
};

/** Panduan jam setara per tahun menurut skenario snapshot (dokumentasi untuk UI dan docs). */
export const CARBON_HOURS_GUIDANCE = {
  sunny: { typical: 1400, min: 1200, max: 1600 },
  rainyHeavy: { typical: 180, min: 120, max: 250 },
} as const;

const fin = (x: number, fallback = 0) => (Number.isFinite(x) ? x : fallback);

/**
 * Ekstrapolasi kondisi sesaat `r` ke setahun dengan `hoursPerYear` jam setara.
 * Kredit listrik PV = listrik kotor; pompa dihitung sebagai penalti terpisah.
 * Bila `baseline` (hasil 'conventional-pv' pada masukan sama) diberikan, hasil juga memuat selisih inkremental
 * terhadap PV konvensional dan pembayaran balik emisi tertanam TAMBAHAN.
 */
export function computeCarbon(r: SimResult, a: CarbonAssumptions, baseline?: SimResult): CarbonResult {
  const h = Math.max(0, fin(a.hoursPerYear)) / 1000;
  const grid = fin(a.gridKgPerKWh);
  const fuel = fin(a.fuelKgPerKWh);
  const electricityKgPerYear = fin(r.electricalW) * h * grid;
  const heatKgPerYear = fin(r.avoidedFuelW) * h * fuel;
  const coolingKgPerYear = a.coolingDisplacementModeled ? fin(r.avoidedCoolingElecW) * h * grid : 0;
  const pumpKgPerYear = fin(r.pumpW) * h * grid;
  const netKgPerYear = electricityKgPerYear + heatKgPerYear + coolingKgPerYear - pumpKgPerYear;
  const carbonPaybackYears = netKgPerYear > 0 ? fin(a.embodiedKg) / netKgPerYear : Infinity;
  const out: CarbonResult = {
    electricityKgPerYear,
    heatKgPerYear,
    coolingKgPerYear,
    pumpKgPerYear,
    netKgPerYear,
    carbonPaybackYears,
  };
  if (baseline) {
    // Buku besar inkremental: kredit bersih unit ini dikurangi kredit bersih PV konvensional pada kondisi yang sama.
    const baseNet = (fin(baseline.electricalW) - fin(baseline.pumpW)) * h * grid;
    const incNet = netKgPerYear - baseNet;
    const incEmbodied = Math.max(0, fin(a.incrementalEmbodiedKg ?? DEFAULT_CARBON.incrementalEmbodiedKg ?? 180));
    out.incrementalNetKgPerYear = incNet;
    out.incrementalPaybackYears = incNet > 0 ? incEmbodied / incNet : Infinity;
  }
  return out;
}
