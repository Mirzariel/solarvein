/**
 * Moist-air psychrometrics (lead-owned, shared by hotel/desiccant/day modules).
 * Saturation pressure over liquid water: Hyland & Wexler (1983) as tabulated in
 * ASHRAE Handbook—Fundamentals, ch. 1 (valid 0–200 °C). Ideal-gas mixing, standard atmosphere default.
 * Evidence: mapan (established engineering correlations).
 */

/** Standard atmospheric pressure [kPa]. */
export const P_ATM_KPA = 101.325;
/** Ratio of molar masses water/dry air. */
const EPS = 0.621945;

/** Saturation vapour pressure over liquid water [kPa] (Hyland–Wexler). */
export function saturationPressureKPa(tC: number): number {
  const T = tC + 273.15;
  const lnP =
    -5.8002206e3 / T +
    1.3914993 +
    -4.8640239e-2 * T +
    4.1764768e-5 * T * T +
    -1.4452093e-8 * T * T * T +
    6.5459673 * Math.log(T);
  return Math.exp(lnP) / 1000;
}

/** Humidity ratio w [kg/kg dry air] from dry-bulb temperature and relative humidity [0..1]. */
export function humidityRatio(tC: number, rh: number, pKPa: number = P_ATM_KPA): number {
  const pw = Math.min(Math.max(rh, 0), 1) * saturationPressureKPa(tC);
  return (EPS * pw) / (pKPa - pw);
}

/** Vapour partial pressure [kPa] from humidity ratio. */
export function vapourPressureKPa(w: number, pKPa: number = P_ATM_KPA): number {
  const ww = Math.max(w, 0);
  return (pKPa * ww) / (EPS + ww);
}

/** Relative humidity [0..1] from dry-bulb temperature and humidity ratio (clamped to 1). */
export function relativeHumidity(tC: number, w: number, pKPa: number = P_ATM_KPA): number {
  return Math.min(vapourPressureKPa(w, pKPa) / saturationPressureKPa(tC), 1);
}

/** Specific enthalpy of moist air [kJ/kg dry air], reference 0 °C dry air / liquid water. */
export function enthalpyKJkg(tC: number, w: number): number {
  return 1.006 * tC + w * (2501 + 1.86 * tC);
}

/** Dew-point temperature [°C] for a humidity ratio (bisection on the saturation curve, 0–100 °C). */
export function dewPointC(w: number, pKPa: number = P_ATM_KPA): number {
  const pw = vapourPressureKPa(w, pKPa);
  let lo = -20;
  let hi = 100;
  for (let k = 0; k < 60; k++) {
    const mid = (lo + hi) / 2;
    if (saturationPressureKPa(mid) < pw) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}

/** Latent heat of vaporisation of water near ambient [kJ/kg] (≈ 2450 at 20 °C; linear fit 0–60 °C). */
export function latentHeatKJkg(tC: number): number {
  return 2501 - 2.361 * tC;
}
