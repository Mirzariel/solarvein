import { describe, expect, it } from 'vitest';
import {
  dewPointC,
  enthalpyKJkg,
  humidityRatio,
  relativeHumidity,
  saturationPressureKPa,
} from '../psychro';

describe('psychrometrics', () => {
  it('saturation pressure matches ASHRAE table values', () => {
    expect(saturationPressureKPa(100)).toBeCloseTo(101.42, 1); // ASHRAE: 101,418 kPa
    expect(saturationPressureKPa(30)).toBeCloseTo(4.247, 2);
    expect(saturationPressureKPa(20)).toBeCloseTo(2.339, 2);
  });

  it('w ↔ RH round-trips', () => {
    for (const t of [20, 30, 45, 60]) {
      for (const rh of [0.1, 0.5, 0.9]) {
        const w = humidityRatio(t, rh);
        expect(relativeHumidity(t, w)).toBeCloseTo(rh, 6);
      }
    }
  });

  it('tropical design air: 30 °C / 75 % RH ≈ 0,020 kg/kg, dew point ≈ 25 °C', () => {
    const w = humidityRatio(30, 0.75);
    expect(w).toBeGreaterThan(0.0195);
    expect(w).toBeLessThan(0.0205);
    expect(dewPointC(w)).toBeCloseTo(25.1, 0);
  });

  it('heating ambient air lowers its RH (regeneration air)', () => {
    const w = humidityRatio(30, 0.75);
    expect(relativeHumidity(35, w)).toBeGreaterThan(0.5);
    expect(relativeHumidity(55, w)).toBeLessThan(0.22);
  });

  it('dew point of saturated air equals its temperature', () => {
    expect(dewPointC(humidityRatio(24, 1))).toBeCloseTo(24, 3);
  });

  it('enthalpy increases with temperature and moisture', () => {
    expect(enthalpyKJkg(30, 0.02)).toBeGreaterThan(enthalpyKJkg(30, 0.01));
    expect(enthalpyKJkg(31, 0.02)).toBeGreaterThan(enthalpyKJkg(30, 0.02));
  });
});
