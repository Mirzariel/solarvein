import { describe, expect, it } from 'vitest';
import { simulate } from '../../model';
import type { DayScenarioId } from '../contract';
import {
  DEFAULT_SYSTEM,
  HOTEL_PRESETS,
  climateAt,
  dailyDhwKWhTh,
  dailyDhwLitres,
  dhwDrawAt,
} from '../hotel';
import { humidityRatio } from '../psychro';
import { tankGeometry } from '../tank';
import { DEFAULT_CARBON_PARAMS } from '../assumptions/carbon';
import { DEFAULT_ECONOMIC_PARAMS } from '../assumptions/economics';

/** Daily plane-of-array energy [kWh/m2] for hours [from, to). */
function ghi(scenario: DayScenarioId, from = 0, to = 24, dt = 0.02): number {
  let sum = 0;
  for (let t = from; t < to; t += dt) sum += (climateAt(scenario, t).irradiance * dt) / 1000;
  return sum;
}

const ALL: DayScenarioId[] = ['terik', 'berawan', 'hujan', 'hujan-3-hari'];

describe('presets', () => {
  it('has the two documented presets with sane values', () => {
    const big = HOTEL_PRESETS['hotel-100'];
    const small = HOTEL_PRESETS['penginapan-kecil'];
    expect(big.rooms).toBe(100);
    expect(small.rooms).toBeGreaterThanOrEqual(10);
    expect(small.rooms).toBeLessThanOrEqual(15);
    for (const h of [big, small]) {
      expect(h.occupancy).toBeGreaterThan(0.5);
      expect(h.occupancy).toBeLessThanOrEqual(0.8);
      expect(h.dhwSetpointC).toBeGreaterThanOrEqual(60);
      expect(h.mainsC).toBeGreaterThanOrEqual(26);
      expect(h.dhwLitresPerOccupiedRoomDay).toBeGreaterThanOrEqual(50);
      expect(h.dhwLitresPerOccupiedRoomDay).toBeLessThanOrEqual(150);
      expect(h.supplyDewPointC).toBeGreaterThanOrEqual(10);
      expect(h.supplyDewPointC).toBeLessThanOrEqual(13);
    }
    expect(big.occupancy).toBeGreaterThanOrEqual(0.65);
    expect(big.occupancy).toBeLessThanOrEqual(0.75);
    expect(big.heater).toBe('lpg');
    expect(big.heaterEfficiency).toBe(0.85);
  });
});

describe('climateAt', () => {
  it('is deterministic', () => {
    for (const sc of ALL) expect(climateAt(sc, 13.37)).toEqual(climateAt(sc, 13.37));
  });

  it('daily GHI per day type (kWh/m2/day): terik ~6,1, berawan ~3,9, hujan ~2,0', () => {
    const terik = ghi('terik');
    const berawan = ghi('berawan');
    const hujan = ghi('hujan');
    console.info(
      'daily GHI kWh/m2:',
      JSON.stringify({ terik, berawan, hujan, hujan3: [0, 24, 48].map((d) => ghi('hujan-3-hari', d, d + 24)) }),
    );
    expect(terik).toBeGreaterThanOrEqual(5.5);
    expect(terik).toBeLessThanOrEqual(6.5);
    expect(berawan).toBeGreaterThanOrEqual(3.5);
    expect(berawan).toBeLessThanOrEqual(4.5);
    expect(hujan).toBeGreaterThanOrEqual(1.5);
    expect(hujan).toBeLessThanOrEqual(3);
    expect(terik).toBeGreaterThan(berawan);
    expect(berawan).toBeGreaterThan(hujan);
  });

  it('clear day: peak 900-950 W/m2, zero at night, ambient 26 to 33 C, RH 85 to 55 %', () => {
    let peak = 0;
    let tMin = 99;
    let tMax = -99;
    for (let t = 0; t < 24; t += 0.05) {
      const c = climateAt('terik', t);
      peak = Math.max(peak, c.irradiance);
      tMin = Math.min(tMin, c.ambientC);
      tMax = Math.max(tMax, c.ambientC);
    }
    expect(peak).toBeGreaterThanOrEqual(900);
    expect(peak).toBeLessThanOrEqual(950);
    expect(tMin).toBeCloseTo(26, 0);
    expect(tMax).toBeCloseTo(33, 0);
    expect(climateAt('terik', 2).irradiance).toBe(0);
    expect(climateAt('terik', 22).irradiance).toBe(0);
    expect(climateAt('terik', 5.5).rh).toBeGreaterThan(0.83);
    expect(climateAt('terik', 14.5).rh).toBeCloseTo(0.55, 2);
    expect(climateAt('terik', 12).rainMmH).toBe(0);
  });

  it('partly cloudy day has smooth variability and a peak near 500-750', () => {
    let peak = 0;
    let maxStep = 0;
    let prev = climateAt('berawan', 0).irradiance;
    for (let t = 0.05; t < 24; t += 0.05) {
      const g = climateAt('berawan', t).irradiance;
      peak = Math.max(peak, g);
      maxStep = Math.max(maxStep, Math.abs(g - prev));
      prev = g;
    }
    expect(peak).toBeGreaterThan(500);
    expect(peak).toBeLessThan(750);
    expect(maxStep).toBeLessThan(40); // W/m2 per 3 min: no jumps
  });

  it('rainy day is NOT zero-sun: diffuse 80-400 W/m2 for hours, humid, rain in the afternoon', () => {
    let hoursInBand = 0;
    let maxRain = 0;
    let maxRainHour = 0;
    for (let t = 0; t < 24; t += 0.05) {
      const c = climateAt('hujan', t);
      if (c.irradiance >= 80 && c.irradiance <= 400) hoursInBand += 0.05;
      expect(c.irradiance).toBeLessThanOrEqual(400);
      expect(c.rh).toBeGreaterThanOrEqual(0.85);
      expect(c.rh).toBeLessThanOrEqual(0.98);
      expect(c.ambientC).toBeGreaterThanOrEqual(24);
      expect(c.ambientC).toBeLessThanOrEqual(28.01);
      if (c.rainMmH > maxRain) {
        maxRain = c.rainMmH;
        maxRainHour = t;
      }
    }
    expect(hoursInBand).toBeGreaterThanOrEqual(5);
    expect(maxRain).toBeGreaterThan(5);
    expect(maxRainHour).toBeGreaterThanOrEqual(12);
    expect(maxRainHour).toBeLessThanOrEqual(18);
    expect(climateAt('hujan', 10).irradiance).toBeGreaterThan(80);
    expect(climateAt('hujan', 0).irradiance).toBe(0);
  });

  it('three-day rain scenario: each day is rainy with a different diffuse level', () => {
    const days = [0, 24, 48].map((d) => ghi('hujan-3-hari', d, d + 24));
    for (const g of days) {
      expect(g).toBeGreaterThanOrEqual(1.5);
      expect(g).toBeLessThanOrEqual(3);
    }
    expect(new Set(days.map((g) => g.toFixed(1))).size).toBe(3);
    let rainHours = 0;
    for (let t = 0; t < 72; t += 0.1) if (climateAt('hujan-3-hari', t).rainMmH > 0) rainHours += 0.1;
    expect(rainHours).toBeGreaterThan(10);
    expect(climateAt('hujan-3-hari', 36).irradiance).toBeGreaterThan(80);
  });

  it('humidity ratio is consistent with psychro and every field is physical', () => {
    for (const sc of ALL) {
      for (let t = 0; t < 72; t += 1.3) {
        const c = climateAt(sc, t);
        expect(c.humidityRatio).toBeCloseTo(humidityRatio(c.ambientC, c.rh), 10);
        expect(c.humidityRatio).toBeGreaterThan(0.015);
        expect(c.humidityRatio).toBeLessThan(0.03);
        expect(c.rh).toBeGreaterThan(0);
        expect(c.rh).toBeLessThanOrEqual(1);
        expect(c.windMs).toBeGreaterThanOrEqual(0);
        expect(c.rainMmH).toBeGreaterThanOrEqual(0);
        expect(c.irradiance).toBeGreaterThanOrEqual(0);
      }
    }
  });
});

describe('dhwDrawAt', () => {
  const hotel = HOTEL_PRESETS['hotel-100'];

  it('integrates to rooms x occupancy x litres per day', () => {
    for (const h of [HOTEL_PRESETS['hotel-100'], HOTEL_PRESETS['penginapan-kecil']]) {
      let v = 0;
      for (let t = 0; t < 24; t += 0.01) v += dhwDrawAt(h, t).drawLph * 0.01;
      expect(v).toBeCloseTo(dailyDhwLitres(h), 0);
      let v15 = 0;
      for (let t = 0; t < 24; t += 0.25) v15 += dhwDrawAt(h, t + 0.125).drawLph * 0.25;
      expect(Math.abs(v15 / dailyDhwLitres(h) - 1)).toBeLessThan(0.01);
    }
    expect(dailyDhwLitres(hotel)).toBeCloseTo(100 * 0.7 * 80, 6);
  });

  it('has morning (6-9) and evening (18-22) peaks and a small night draw', () => {
    const at = (h: number) => dhwDrawAt(hotel, h).drawLph;
    const morning = Math.max(at(6.5), at(7.5), at(8.5));
    const evening = Math.max(at(18.5), at(19.5), at(20.5), at(21.5));
    const midday = at(13.5);
    const night = at(2.5);
    expect(morning).toBeGreaterThan(2 * midday);
    expect(evening).toBeGreaterThan(2 * midday);
    expect(night).toBeLessThan(0.05 * morning);
    expect(night).toBeGreaterThan(0);
  });

  it('demandW = m cp (setpoint - mains), wraps hourOfDay and sums to the daily energy', () => {
    const d = dhwDrawAt(hotel, 7.5);
    const expected = ((d.drawLph * 0.99) / 3600) * 4186 * (hotel.dhwSetpointC - hotel.mainsC);
    expect(d.demandW).toBeCloseTo(expected, 4);
    expect(dhwDrawAt(hotel, 31.5)).toEqual(dhwDrawAt(hotel, 7.5));
    let kwh = 0;
    for (let t = 0; t < 24; t += 0.01) kwh += (dhwDrawAt(hotel, t).demandW * 0.01) / 1000;
    expect(kwh).toBeCloseTo(dailyDhwKWhTh(hotel), 0);
    expect(dailyDhwKWhTh(hotel)).toBeGreaterThan(190);
    expect(dailyDhwKWhTh(hotel)).toBeLessThan(220);
  });
});

describe('DEFAULT_SYSTEM sizing', () => {
  const sys = DEFAULT_SYSTEM;
  const area = sys.array.modules * sys.array.module.areaM2;

  it('is a realistic roof array, not 5 m2, with the requested module settings', () => {
    expect(area).toBeGreaterThan(40);
    expect(area).toBeLessThan(150);
    expect(sys.array.module.heatLoadAvailable).toBe(true);
    expect(sys.array.module.hotSourceAvailable).toBe(false);
    expect(sys.array.module.rainMmH).toBe(0);
    expect(sys.array.module.pumpControl).toBe('on');
    expect(sys.hotel).toEqual(HOTEL_PRESETS['hotel-100']);
  });

  it('tank is 50-75 L/m2 with U 0,4-0,8 W/m2K, max 85 C', () => {
    const lPerM2 = sys.tank.volumeL / area;
    expect(lPerM2).toBeGreaterThanOrEqual(50);
    expect(lPerM2).toBeLessThanOrEqual(75);
    const u = sys.tank.uaWPerK / tankGeometry(sys.tank.volumeL).surfaceM2;
    expect(u).toBeGreaterThanOrEqual(0.4);
    expect(u).toBeLessThanOrEqual(0.8);
    expect(sys.tank.maxC).toBe(85);
  });

  it('matches the contract defaults for desiccant, controller, carbon and heat pump', () => {
    expect(sys.desiccant).toMatchObject({
      enabled: true,
      material: 'silica-rd',
      cycleMin: 20,
      cycleEffectiveness: 0.45,
      regenAir: 'ambient',
      pressureDropPa: 200,
      fanEfficiency: 0.5,
    });
    expect(sys.controller).toEqual({ strategy: 'adaptive', onK: 6, offK: 2, desiccantMinRegenC: 45 });
    // carbon/economic defaults have one source of truth (assumptions/{carbon,economics}.ts)
    expect(sys.carbon).toEqual(DEFAULT_CARBON_PARAMS);
    expect(sys.economics).toEqual(DEFAULT_ECONOMIC_PARAMS);
    expect(sys.heatPumpSource).toEqual({ enabled: false, carnotFraction: 0.45 });
  });

  it('collector potential covers roughly 30-70 % of DHW demand (illustrative day-type weights)', () => {
    // Heat the array could deliver with the tank bottom near 38 C, per day type (before tank losses).
    const potential = (sc: DayScenarioId): number => {
      let q = 0;
      for (let t = 0; t < 24; t += 0.1) {
        const c = climateAt(sc, t);
        if (c.irradiance < 30) continue;
        const r = simulate({
          ...sys.array.module,
          irradiance: c.irradiance,
          ambientC: c.ambientC,
          windMs: c.windMs,
          rainMmH: c.rainMmH,
          inletC: 38,
        });
        q += (Math.max(r.qLiquidW, 0) * sys.array.modules * 0.1) / 1000;
      }
      return q;
    };
    const demand = dailyDhwKWhTh(sys.hotel);
    const weights = { terik: 140, berawan: 130, hujan: 95 } as const; // days/year, illustrative
    let annual = 0;
    let annualDemand = 0;
    for (const sc of ['terik', 'berawan', 'hujan'] as const) {
      annual += Math.min(potential(sc), demand) * weights[sc];
      annualDemand += demand * weights[sc];
    }
    const fraction = annual / annualDemand;
    console.info('gross array potential / DHW demand (illustrative):', fraction.toFixed(2));
    expect(fraction).toBeGreaterThan(0.3);
    expect(fraction).toBeLessThan(0.7);
  });
});
