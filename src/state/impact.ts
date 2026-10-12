/**
 * Pemindai dampak ("Jika N atap…"): skala dari satu atap ke banyak atap.
 *
 * Semua angka berasal dari `simulate()` pada preset Cerah/Hujan (satu panel, `PRESETS[skenario].areaM2`), dikali jam setara
 * per tahun dan jumlah atap. Tidak ada angka yang diketik tangan. Hanya fungsi murni di sini; tampilan ada di
 * `sections/Impact.tsx`.
 *
 *   kWh_e/tahun   = P_net[W] · h / 1000                      (listrik PV dikurangi pompa)
 *   kWh_th/tahun  = Q_berguna[W] · h / 1000                  (hanya bila ada beban panas nyata)
 *   kWh_th dibuang= Q_dibuang[W] · h / 1000                  (hanya bila ada sumber panas nyata)
 *   kgCO2e inkremental = computeCarbon(r, a, baseline).incrementalNetKgPerYear
 *                      = net(SolarVein) − net(PV konvensional) pada masukan yang sama
 *   total         = per panel × panel per atap × N atap
 */
import {
  PRESETS,
  computeCarbon,
  simulate,
  type CarbonAssumptions,
  type CarbonResult,
  type SimResult,
} from '../sim';
import type { ImpactScenario } from './store';

export interface ImpactAssumptions {
  gridKgPerKWh: number;
  fuelKgPerKWh: number;
  /** Jam setara beban penuh per tahun untuk skenario ini. */
  hoursPerYear: number;
  incrementalEmbodiedKg: number;
  coolingDisplacementModeled: boolean;
  /**
   * Porsi jam setara yang punya beban panas (0–1). Berlaku hanya bila skenario punya beban panas (Cerah).
   * Jam tanpa beban BUKAN netral: panel berinsulasi tanpa sirkulasi lebih panas dan listriknya turun, jadi hasil jam
   * itu diambil dari simulasi tanpa beban (pompa mati). Hasil = f × (dengan beban) + (1 − f) × (tanpa beban).
   */
  loadFraction: number;
}

export interface ImpactPerRoof {
  scenario: ImpactScenario;
  /** Hasil dengan beban/sumber seperti preset. */
  dual: SimResult;
  /** Hasil jam tanpa beban panas (pompa mati); sama dengan `dual` bila skenario tidak punya beban panas. */
  idle: SimResult;
  conv: SimResult;
  /** Pecahan jam dengan beban yang benar-benar dipakai (1 bila skenario tanpa beban panas). */
  loadFraction: number;
  carbon: CarbonResult;
  /** Semua dalam kWh per tahun per atap. */
  kWhElectricNet: number;
  kWhElectricGross: number;
  kWhPump: number;
  kWhElectricConv: number;
  kWhThermalUseful: number;
  kWhThermalRejected: number;
  /** kgCO2e/tahun per atap, selisih terhadap PV konvensional (negatif = PV konvensional lebih baik). */
  incrementalKg: number;
  /** Tahun; Infinity bila tambahan ≤ 0. */
  incrementalPaybackYears: number;
}

export interface ImpactTotals {
  roofs: number;
  panels: number;
  kWhElectricNet: number;
  kWhThermalUseful: number;
  kWhThermalRejected: number;
  incrementalKg: number;
  areaM2: number;
}

const presetCache = new Map<ImpactScenario, { dual: SimResult; conv: SimResult; idle: SimResult }>();

/** Hasil simulasi preset (dihitung sekali; masukan preset konstan). */
export function presetPair(scenario: ImpactScenario): { dual: SimResult; conv: SimResult; idle: SimResult } {
  let p = presetCache.get(scenario);
  if (!p) {
    const inputs = PRESETS[scenario];
    const hasLoad = inputs.heatLoadAvailable;
    const dual = simulate(inputs, 'solarvein-dual');
    p = {
      dual,
      conv: simulate(inputs, 'conventional-pv'),
      // Jam tanpa beban panas: pengendali mematikan pompa (panel stagnan, listrik turun).
      idle: hasLoad ? simulate({ ...inputs, heatLoadAvailable: false }, 'solarvein-dual') : dual,
    };
    presetCache.set(scenario, p);
  }
  return p;
}

export function impactPerRoof(scenario: ImpactScenario, a: ImpactAssumptions): ImpactPerRoof {
  const { dual, conv, idle } = presetPair(scenario);
  const hasLoad = dual.inputs.heatLoadAvailable;
  const fl = hasLoad ? Math.min(1, Math.max(0, a.loadFraction)) : 1;
  const ca: CarbonAssumptions = {
    gridKgPerKWh: a.gridKgPerKWh,
    fuelKgPerKWh: a.fuelKgPerKWh,
    hoursPerYear: a.hoursPerYear,
    embodiedKg: 0,
    coolingDisplacementModeled: a.coolingDisplacementModeled,
    incrementalEmbodiedKg: a.incrementalEmbodiedKg,
  };
  const cLoad = computeCarbon(dual, ca, conv);
  const cIdle = computeCarbon(idle, ca, conv);
  const mix = (x: number, y: number) => fl * x + (1 - fl) * y;
  const incKg = mix(cLoad.incrementalNetKgPerYear ?? 0, cIdle.incrementalNetKgPerYear ?? 0);
  const embodied = Math.max(0, a.incrementalEmbodiedKg);
  const carbon: CarbonResult = {
    electricityKgPerYear: mix(cLoad.electricityKgPerYear, cIdle.electricityKgPerYear),
    heatKgPerYear: mix(cLoad.heatKgPerYear, cIdle.heatKgPerYear),
    coolingKgPerYear: mix(cLoad.coolingKgPerYear, cIdle.coolingKgPerYear),
    pumpKgPerYear: mix(cLoad.pumpKgPerYear, cIdle.pumpKgPerYear),
    netKgPerYear: mix(cLoad.netKgPerYear, cIdle.netKgPerYear),
    carbonPaybackYears: Infinity,
    incrementalNetKgPerYear: incKg,
    incrementalPaybackYears: incKg > 0 ? embodied / incKg : Infinity,
  };
  const h = Math.max(0, a.hoursPerYear) / 1000;
  return {
    scenario,
    dual,
    idle,
    conv,
    loadFraction: fl,
    carbon,
    kWhElectricNet: mix(dual.netElectricalW, idle.netElectricalW) * h,
    kWhElectricGross: mix(dual.electricalW, idle.electricalW) * h,
    kWhPump: mix(dual.pumpW, idle.pumpW) * h,
    kWhElectricConv: conv.netElectricalW * h,
    kWhThermalUseful: mix(dual.usefulHeatW, idle.usefulHeatW) * h,
    kWhThermalRejected: mix(dual.heatRejectedW, idle.heatRejectedW) * h,
    incrementalKg: incKg,
    incrementalPaybackYears: carbon.incrementalPaybackYears ?? Infinity,
  };
}

/** Total = per panel × jumlah atap × panel per atap. */
export function scaleImpact(p: ImpactPerRoof, roofs: number, panelsPerRoof = 1): ImpactTotals {
  const n = roofs * panelsPerRoof;
  return {
    roofs,
    panels: n,
    kWhElectricNet: p.kWhElectricNet * n,
    kWhThermalUseful: p.kWhThermalUseful * n,
    kWhThermalRejected: p.kWhThermalRejected * n,
    incrementalKg: p.incrementalKg * n,
    areaM2: p.dual.inputs.areaM2 * n,
  };
}

/** Nilai kalor LPG: 46 MJ/kg ÷ 3,6 = 12,78 kWh/kg bahan bakar. */
export const LPG_KWH_PER_KG = 46 / 3.6;
/** kg LPG per panel per tahun yang setara dengan panas berguna (avoidedFuelW simulasi × porsi jam dengan beban). */
export function lpgKgPerPanel(p: ImpactPerRoof, hoursPerYear: number): number {
  return (p.dual.avoidedFuelW * p.loadFraction * Math.max(0, hoursPerYear)) / 1000 / LPG_KWH_PER_KG;
}

/** log10(N) → jumlah atap "bulat" (2 angka signifikan; 1…100.000). */
export function roofsFromLog(v: number): number {
  const raw = Math.pow(10, Math.min(5, Math.max(0, v)));
  if (raw < 100) return Math.max(1, Math.round(raw));
  const mag = Math.pow(10, Math.floor(Math.log10(raw)) - 1);
  return Math.min(100_000, Math.round(raw / mag) * mag);
}

/** Pilih satuan terbaik: nilai dalam kWh → kWh / MWh / GWh. */
export function energyUnit(kWh: number): { value: number; unit: 'kWh' | 'MWh' | 'GWh' } {
  const a = Math.abs(kWh);
  if (a >= 1e6) return { value: kWh / 1e6, unit: 'GWh' };
  if (a >= 1e3) return { value: kWh / 1e3, unit: 'MWh' };
  return { value: kWh, unit: 'kWh' };
}

/** kgCO2e → kg / ton / kiloton (label "CO2e" ditulis terpisah oleh UI). */
export function massUnit(kg: number): { value: number; unit: 'kg' | 'ton' | 'kiloton' } {
  const a = Math.abs(kg);
  if (a >= 1e7) return { value: kg / 1e6, unit: 'kiloton' };
  if (a >= 1e3) return { value: kg / 1e3, unit: 'ton' };
  return { value: kg, unit: 'kg' };
}

/** Angka desimal yang pantas untuk nilai tampilan (≥100 → 0, ≥10 → 1, selain itu 2 desimal bila nilainya kecil). */
export function niceDigits(v: number): number {
  const a = Math.abs(v);
  if (a >= 100) return 0;
  if (a >= 10) return 1;
  return a >= 1 ? 1 : 2;
}

/** Buku besar emisi per panel per tahun (kgCO2e) terhadap PV biasa: baris-barisnya dijumlahkan menjadi `total` (= incrementalKg). */
export interface ImpactLedger {
  electricityDiffKg: number;
  heatKg: number;
  coolingKg: number;
  /** Negatif (pengurang). */
  pumpKg: number;
  total: number;
}

export function impactLedger(p: ImpactPerRoof, a: Pick<ImpactAssumptions, 'hoursPerYear' | 'gridKgPerKWh'>): ImpactLedger {
  const h = Math.max(0, a.hoursPerYear) / 1000;
  // Listrik PV kotor TERBOBOT porsi jam dengan beban (jam tanpa beban kehilangan listrik: panel stagnan lebih panas).
  const electricityDiffKg = (p.kWhElectricGross - p.conv.electricalW * h) * a.gridKgPerKWh;
  return {
    electricityDiffKg,
    heatKg: p.carbon.heatKgPerYear,
    coolingKg: p.carbon.coolingKgPerYear,
    pumpKg: -p.carbon.pumpKgPerYear,
    total: p.incrementalKg,
  };
}

/** Selisih listrik bersih SolarVein terhadap PV biasa [kWh per panel per tahun], BERTANDA (negatif = lebih rendah). */
export function electricityVsConvKWh(p: ImpactPerRoof): number {
  return p.kWhElectricNet - p.kWhElectricConv;
}

/** Manfaat bersih pembuangan panas [W listrik] setelah pompa DAN penurunan daya PV (acuan: PV biasa pada masukan sama). */
export function netRejectionBenefitW(dual: SimResult, conv: SimResult): number {
  return dual.avoidedCoolingElecW + dual.netElectricalW - conv.netElectricalW;
}
