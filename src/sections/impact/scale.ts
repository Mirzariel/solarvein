/**
 * Hotel scaler support. BPS 2023 counts are PUBLISHED statistics (refId bps-hotel-2023); everything else is the
 * sim. Scaling is a plain multiplication of one simulated hotel and is labelled illustrative wherever it shows.
 */
import {
  DEFAULT_MODULES,
  HOTEL_PRESETS,
  TANK_L_PER_M2,
  TANK_U_W_PER_M2K,
  dailyDhwLitres,
  tankUaWPerK,
} from '../../sim/system';

export type PresetId = keyof typeof HOTEL_PRESETS;

/** BPS (2023), "Statistik hotel dan akomodasi lainnya di Indonesia 2023". */
export const BPS = {
  starHotelsIndonesia: 4129,
  starHotelsBali: 541,
  /** Non-star accommodation businesses in Indonesia. */
  nonStarIndonesia: 24867,
} as const;

/**
 * Array and tank for a preset, by the same arithmetic as DEFAULT_SYSTEM (modules ∝ daily hot-water volume,
 * tank 60 L per m² of collector, U 0,5 W/m²K). Without it the guesthouse would carry the 100-room array.
 */
export function sizingFor(id: PresetId, moduleAreaM2: number): { modules: number; volumeL: number; uaWPerK: number } {
  const ratio = dailyDhwLitres(HOTEL_PRESETS[id]) / dailyDhwLitres(HOTEL_PRESETS['hotel-100']);
  const modules = Math.max(2, Math.round(DEFAULT_MODULES * ratio));
  const volumeL = Math.max(200, Math.round((modules * moduleAreaM2 * TANK_L_PER_M2) / 100) * 100);
  return { modules, volumeL, uaWPerK: tankUaWPerK(volumeL, TANK_U_W_PER_M2K) };
}
