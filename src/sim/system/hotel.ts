/**
 * Hotel, climate and default system (W2a).
 *
 *  - HOTEL_PRESETS: illustrative 100-room lowland hotel and a small guesthouse (inclusivity angle).
 *  - climateAt(): deterministic analytic weather for the four day types. Rainy days are NOT zero-sun:
 *    diffuse light of roughly 80-400 W/m² for some hours (GHI ≈ 1.5-3 kWh/m²/day).
 *  - dhwDrawAt(): hourly hot-water draw with morning and evening peaks, normalised to the daily volume.
 *  - DEFAULT_SYSTEM: the 100-room hotel with a REALISTIC array (sizing arithmetic in assumptions/hotel.ts).
 *
 * All numbers here are illustrative engineering assumptions (tag: asumsi); published values arrive later
 * through refIds (TODO(R0)). No randomness anywhere: weather variability is a fixed analytic pattern.
 */
import type {
  ClimatePoint,
  DayScenarioId,
  HotelParams,
  SystemInputs,
} from './contract';
import { kWhTh, type KWhTh } from './contract';
import { DEFAULT_INPUTS } from '../presets';
import { WATER_CP_J_PER_KG_K, WATER_RHO_KG_PER_L, dhwDemandW } from './dhw';
import { humidityRatio } from './psychro';
import { tankUaWPerK } from './tank';
import { DEFAULT_CARBON_PARAMS } from './assumptions/carbon';
import { DEFAULT_ECONOMIC_PARAMS } from './assumptions/economics';

// ─────────────────────────────────────────────────────────────────────────────
// Hotel presets
// ─────────────────────────────────────────────────────────────────────────────
export const HOTEL_PRESETS: Record<'hotel-100' | 'penginapan-kecil', HotelParams> = {
  'hotel-100': {
    label: 'Hotel 100 kamar (ilustrasi, dataran rendah)',
    rooms: 100,
    occupancy: 0.7,
    dhwLitresPerOccupiedRoomDay: 80,
    dhwSetpointC: 60,
    mainsC: 28,
    heater: 'lpg',
    heaterEfficiency: 0.85,
    freshAirKgS: 1.1,
    supplyDewPointC: 11,
  },
  'penginapan-kecil': {
    label: 'Penginapan kecil (±12 kamar)',
    rooms: 12,
    occupancy: 0.6,
    dhwLitresPerOccupiedRoomDay: 50,
    dhwSetpointC: 60,
    mainsC: 28,
    heater: 'electric-resistance',
    heaterEfficiency: 0.95,
    freshAirKgS: 0.1,
    supplyDewPointC: 13,
  },
};

/** Hot water volume per day at the setpoint [L/day]. */
export function dailyDhwLitres(h: HotelParams): number {
  return h.rooms * h.occupancy * h.dhwLitresPerOccupiedRoomDay;
}

/** Heat needed per day to take the hot-water volume from mains to the setpoint [kWh_th]. */
export function dailyDhwKWhTh(h: HotelParams): KWhTh {
  const kg = dailyDhwLitres(h) * WATER_RHO_KG_PER_L;
  return kWhTh((kg * WATER_CP_J_PER_KG_K * (h.dhwSetpointC - h.mainsC)) / 3.6e6);
}

// ─────────────────────────────────────────────────────────────────────────────
// Hot-water draw profile
// ─────────────────────────────────────────────────────────────────────────────
/**
 * Relative hourly draw weights (hour 0..23, each value is the draw during that clock hour).
 * Morning peak 6-9, evening peak 18-22, small night draw. Shape = asumsi (hotel guest showers).
 */
const DRAW_WEIGHTS: readonly number[] = [
  0.25, 0.12, 0.1, 0.1, 0.25, 1.0, 5.5, 9.0, 8.0, 5.0, 3.0, 2.5, 3.0, 3.0, 2.5, 2.5, 3.0, 4.0, 7.0, 9.0, 8.5, 6.0,
  3.5, 1.2,
];
const DRAW_WEIGHT_SUM = DRAW_WEIGHTS.reduce((a, b) => a + b, 0);

/**
 * Hot-water draw at an hour of day. Linear interpolation between hour centres keeps the profile smooth
 * and integrates EXACTLY to the daily volume (periodic trapezoid rule).
 * drawLph is at the setpoint; demandW = ṁ·cp·(setpoint − mains).
 */
export function dhwDrawAt(hotel: HotelParams, hourOfDay: number): { drawLph: number; demandW: number } {
  const h = ((hourOfDay % 24) + 24) % 24;
  const p = h - 0.5;
  const i0 = Math.floor(p);
  const f = p - i0;
  const a = DRAW_WEIGHTS[((i0 % 24) + 24) % 24] ?? 0;
  const b = DRAW_WEIGHTS[(((i0 + 1) % 24) + 24) % 24] ?? 0;
  const w = (a * (1 - f) + b * f) / DRAW_WEIGHT_SUM; // fraction of the daily volume per hour
  const drawLph = dailyDhwLitres(hotel) * w;
  return { drawLph, demandW: dhwDemandW(drawLph, hotel.mainsC, hotel.dhwSetpointC) };
}

// ─────────────────────────────────────────────────────────────────────────────
// Climate
// ─────────────────────────────────────────────────────────────────────────────
interface DayProfile {
  tMinC: number;
  tMaxC: number;
  rhMax: number;
  rhMin: number;
  /** Clear-sky-like peak of the daylight shape [W/m²]. */
  gPeak: number;
  /** Shape exponent of the daylight bell (1,6 → ~6 kWh/m²/day at 930 W/m² peak). */
  shapeP: number;
  /** Cloud/diffuse transmission factor k(h) multiplying the daylight shape. */
  k: (h: number) => number;
  rainPeakMmH: number;
  rainStartH: number;
  rainEndH: number;
  /** Fractional irradiance loss at the rain peak [0..1]. */
  rainDimming: number;
  windBase: number;
  windAfternoon: number;
}

const SUNRISE_H = 6;
const SUNSET_H = 18;

function daylightShape(h: number, p: number): number {
  if (h <= SUNRISE_H || h >= SUNSET_H) return 0;
  return Math.pow(Math.sin((Math.PI * (h - SUNRISE_H)) / (SUNSET_H - SUNRISE_H)), p);
}

/** Half-cosine rise to the afternoon maximum, half-cosine fall through the night to the dawn minimum. */
function diurnalTemp(h: number, tMin: number, tMax: number, hMin = 5.5, hMax = 14.5): number {
  const rise = (1 - Math.cos(Math.PI * Math.min(Math.max((h - hMin) / (hMax - hMin), 0), 1))) / 2;
  if (h >= hMin && h <= hMax) return tMin + (tMax - tMin) * rise;
  const hh = h > hMax ? h - hMax : h + 24 - hMax;
  const dur = 24 - (hMax - hMin);
  const fall = (1 - Math.cos(Math.PI * Math.min(hh / dur, 1))) / 2;
  return tMax - (tMax - tMin) * fall;
}

const CLEAR: DayProfile = {
  tMinC: 26,
  tMaxC: 33,
  rhMax: 0.85,
  rhMin: 0.55,
  gPeak: 930,
  shapeP: 1.6,
  k: () => 1,
  rainPeakMmH: 0,
  rainStartH: 0,
  rainEndH: 0,
  rainDimming: 0,
  windBase: 1.2,
  windAfternoon: 1.2,
};

const PARTLY: DayProfile = {
  ...CLEAR,
  tMinC: 25.5,
  tMaxC: 31,
  rhMax: 0.88,
  rhMin: 0.65,
  gPeak: 880,
  // smooth, fixed analytic cloud pattern (no randomness)
  k: (h) => 0.68 + 0.09 * Math.sin((2 * Math.PI * h) / 2.7 + 0.5) + 0.05 * Math.sin((2 * Math.PI * h) / 1.1 + 1.2),
  windBase: 1.5,
  windAfternoon: 1.0,
};

const RAINY: DayProfile = {
  ...CLEAR,
  tMinC: 24.2,
  tMaxC: 28,
  rhMax: 0.97,
  rhMin: 0.85,
  gPeak: 930,
  // overcast: diffuse only (transmission ~0,36 of the clear-sky bell)
  k: (h) => 0.36 + 0.07 * Math.sin((2 * Math.PI * h) / 3.3 + 1),
  rainPeakMmH: 10,
  rainStartH: 13,
  rainEndH: 18,
  rainDimming: 0.4,
  windBase: 2.0,
  windAfternoon: 1.0,
};

/** Three rainy days with slightly different diffuse levels, rain timing and intensity. */
const RAINY_3: DayProfile[] = [
  { ...RAINY, k: (h) => 0.9 * RAINY.k(h), rainPeakMmH: 8, rainStartH: 13, rainEndH: 18, tMaxC: 27.5 },
  { ...RAINY, k: (h) => 0.86 * RAINY.k(h + 0.7), rainPeakMmH: 14, rainStartH: 11, rainEndH: 19, rainDimming: 0.45, tMinC: 23.8, tMaxC: 26.5, rhMin: 0.9 },
  { ...RAINY, k: (h) => 1.15 * RAINY.k(h + 1.4), rainPeakMmH: 6, rainStartH: 14, rainEndH: 17.5, tMaxC: 28.5 },
];

function climateFrom(d: DayProfile, h: number): ClimatePoint {
  const ambientC = diurnalTemp(h, d.tMinC, d.tMaxC);
  const s = Math.min(Math.max((ambientC - d.tMinC) / (d.tMaxC - d.tMinC), 0), 1);
  let rh = d.rhMax - (d.rhMax - d.rhMin) * s;

  let rainMmH = 0;
  let rainBump = 0;
  if (d.rainPeakMmH > 0 && h > d.rainStartH && h < d.rainEndH) {
    rainBump = Math.pow(Math.sin((Math.PI * (h - d.rainStartH)) / (d.rainEndH - d.rainStartH)), 2);
    rainMmH = d.rainPeakMmH * rainBump;
    rh = Math.max(rh, 0.9 + 0.08 * rainBump);
  }
  rh = Math.min(rh, 0.98);

  const g = d.gPeak * daylightShape(h, d.shapeP) * d.k(h) * (1 - d.rainDimming * rainBump);
  const day = daylightShape(h, 1) > 0 ? Math.sin((Math.PI * (h - SUNRISE_H)) / (SUNSET_H - SUNRISE_H)) : 0;

  return {
    irradiance: Math.max(g, 0),
    ambientC,
    rh,
    humidityRatio: humidityRatio(ambientC, rh),
    windMs: d.windBase + d.windAfternoon * day,
    rainMmH,
  };
}

/**
 * Weather at t hours since the scenario start (hourOfDay = t mod 24).
 * 'terik' clear · 'berawan' partly cloudy · 'hujan' rainy day (diffuse, afternoon rain) ·
 * 'hujan-3-hari' three consecutive rainy days (t in 0..72; wraps beyond).
 */
export function climateAt(scenario: DayScenarioId, t: number): ClimatePoint {
  const h = ((t % 24) + 24) % 24;
  switch (scenario) {
    case 'terik':
      return climateFrom(CLEAR, h);
    case 'berawan':
      return climateFrom(PARTLY, h);
    case 'hujan':
      return climateFrom(RAINY, h);
    case 'hujan-3-hari': {
      const day = ((Math.floor(t / 24) % 3) + 3) % 3;
      return climateFrom(RAINY_3[day] ?? RAINY, h);
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Default system (100-room hotel)
// ─────────────────────────────────────────────────────────────────────────────
/** PV/T modules on the roof: 30 × 1,7 m² = 51 m² (sizing arithmetic: assumptions/hotel.ts). */
export const DEFAULT_MODULES = 50;
/** Buffer-tank volume per m² of collector [L/m²] (range 50-75). */
export const TANK_L_PER_M2 = 60;
/** Tank surface U-value including insulation and fittings [W/(m²·K)] (range 0,4-0,8). */
export const TANK_U_W_PER_M2K = 0.5;

const DEFAULT_TANK_L = Math.round((DEFAULT_MODULES * DEFAULT_INPUTS.areaM2 * TANK_L_PER_M2) / 100) * 100;

export const DEFAULT_SYSTEM: SystemInputs = {
  hotel: { ...HOTEL_PRESETS['hotel-100'] },
  array: {
    modules: DEFAULT_MODULES,
    module: {
      ...DEFAULT_INPUTS,
      heatLoadAvailable: true,
      hotSourceAvailable: false,
      rainMmH: 0,
      pumpControl: 'on',
    },
  },
  tank: {
    volumeL: DEFAULT_TANK_L,
    uaWPerK: tankUaWPerK(DEFAULT_TANK_L, TANK_U_W_PER_M2K),
    maxC: 85,
    initialTopC: 45,
    initialBottomC: 35,
  },
  desiccant: {
    enabled: true,
    material: 'silica-rd',
    bedMassKg: 300,
    cycleMin: 20,
    cycleEffectiveness: 0.45,
    regenAir: 'ambient',
    pressureDropPa: 200,
    fanEfficiency: 0.5,
    regenAirKgS: 1.0,
  },
  controller: { strategy: 'adaptive', onK: 6, offK: 2, desiccantMinRegenC: 45 },
  // Single source of truth for carbon & economic defaults: assumptions/{carbon,economics}.ts (W4).
  carbon: { ...DEFAULT_CARBON_PARAMS },
  economics: { ...DEFAULT_ECONOMIC_PARAMS },
  heatPumpSource: { enabled: false, carnotFraction: 0.45 },
};
