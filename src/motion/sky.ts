/**
 * Page sky levels from the VISUAL frame (pure, testable). Four stacked layers, each an opacity 0..1:
 *   rain   the grey-blue gradient (`sky-rainy` tokens): overcast, rain and the plain night sky underneath
 *   dawn   the warm `sky-sunny` stops reversed (warm at the horizon, clear above): sunrise and sunset glow
 *   sun    the warm day gradient (`sky-sunny`): follows the irradiance, so cloud and rain thin it by themselves
 *   night  a faint ink veil (token `ink`, <= 7 %): the page stays light and readable, only quieter
 * Time of day comes from the clock hour (hour of day), condition from G, rain and relative humidity: a humid
 * afternoon is greyer than a dry one at the same hour. No colour is defined here, only opacities.
 */
import { clamp01, smoothstep } from './spring';

export interface SkyLevels {
  rain: number;
  dawn: number;
  sun: number;
  night: number;
}

/** 0 at night, 1 in daylight (sunrise about 6 h, sunset about 18 h; Bali is near the equator). */
export function daylight(hourOfDay: number): number {
  return smoothstep(5, 6.8, hourOfDay) * (1 - smoothstep(17.2, 19, hourOfDay));
}

/** Warm twilight bell around sunrise (6 h) and sunset (18 h). */
export function twilight(hourOfDay: number): number {
  const dawn = smoothstep(4.8, 6, hourOfDay) * (1 - smoothstep(6, 7.8, hourOfDay));
  const dusk = smoothstep(16.6, 17.9, hourOfDay) * (1 - smoothstep(17.9, 19.4, hourOfDay));
  return dawn + dusk;
}

export function skyLevels(irradiance: number, rainMmH: number, rh: number, hourOfDay: number): SkyLevels {
  const wet = clamp01(rainMmH / 30);
  const haze = clamp01((rh - 0.72) / 0.28);
  const sun = clamp01((irradiance - 120) / 780) * (1 - 0.3 * haze);
  return {
    rain: 1 - 0.5 * wet,
    sun,
    dawn: 0.9 * twilight(hourOfDay) * (1 - wet) * (1 - sun),
    night: 0.07 * (1 - daylight(hourOfDay)),
  };
}
