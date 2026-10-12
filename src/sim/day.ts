import { simulate } from './model';
import type { CollectorConfig, DayPoint, SimInputs } from './types';

export type DayScenario = 'cerah' | 'hujan';

/** Puncak irradiansi hari cerah [W/m²] dan hari hujan/mendung [W/m²] (sudah teredam awan). */
export const DAY_PEAK_G = { cerah: 900, hujan: 250 } as const;

/** Hujan per jam (mm/jam) pada skenario 'hujan': kering pagi, hujan sore 13–17 h. */
const RAIN_BY_HOUR: Record<number, number> = { 13: 6, 14: 14, 15: 22, 16: 10, 17: 4 };

const cosEase = (x: number) => 0.5 * (1 - Math.cos(Math.PI * Math.min(1, Math.max(0, x))));

function ambientCerah(h: number): number {
  // 26 °C (06) → 33 °C (14) → 29 °C (18), kurva mulus (setengah kosinus).
  if (h <= 14) return 26 + 7 * cosEase((h - 6) / 8);
  return 33 - 4 * cosEase((h - 14) / 4);
}

function ambientHujan(h: number): number {
  // 24,5 °C (06) → 27,5 °C (12) → 24 °C (16–18): lebih sejuk dan melandai akibat awan/hujan.
  if (h <= 12) return 24.5 + 3 * cosEase((h - 6) / 6);
  if (h <= 16) return 27.5 - 3.5 * cosEase((h - 12) / 4);
  return 24;
}

/**
 * Profil harian kuasi-steady, jam 6..18 (13 titik). Setiap jam menyelesaikan model steady yang sama;
 * inersia termal diabaikan. Hanya ilustratif. Irradiansi, suhu udara, dan hujan ditentukan skenario;
 * semua masukan lain (T_in, debit, luas, beban/sumber panas, angin…) diambil dari `base`.
 */
export function simulateDay(
  base: SimInputs,
  scenario: DayScenario,
  config: CollectorConfig = 'solarvein-dual',
): DayPoint[] {
  const pts: DayPoint[] = [];
  for (let hour = 6; hour <= 18; hour++) {
    const sun = Math.max(0, Math.sin((Math.PI * (hour - 6)) / 12));
    let irradiance: number;
    let ambientC: number;
    let rainMmH: number;
    if (scenario === 'cerah') {
      irradiance = DAY_PEAK_G.cerah * sun;
      ambientC = ambientCerah(hour);
      rainMmH = 0;
    } else {
      rainMmH = RAIN_BY_HOUR[hour] ?? 0;
      // Awan tebal meredam irradiansi; hujan deras meredam lebih jauh (hingga −35 %).
      irradiance = DAY_PEAK_G.hujan * sun * (1 - 0.35 * Math.min(1, rainMmH / 15));
      ambientC = ambientHujan(hour);
    }
    const inputs: SimInputs = { ...base, irradiance, ambientC, rainMmH };
    const result = simulate(inputs, config);
    pts.push({ hour, irradiance: result.inputs.irradiance, ambientC: result.inputs.ambientC, rainMmH: result.inputs.rainMmH, result });
  }
  return pts;
}

/** Ringkasan energi harian [kWh] dari titik per jam (setiap titik dihitung mewakili 1 jam). */
export function summarizeDay(points: DayPoint[]) {
  const kWh = (sel: (p: DayPoint) => number) => points.reduce((s, p) => s + sel(p), 0) / 1000;
  return {
    solarKWh: kWh((p) => p.result.solarInputW),
    electricalKWh: kWh((p) => p.result.electricalW),
    pumpKWh: kWh((p) => p.result.pumpW),
    netElectricalKWh: kWh((p) => p.result.netElectricalW),
    usefulHeatKWh: kWh((p) => p.result.usefulHeatW),
    heatRejectedKWh: kWh((p) => p.result.heatRejectedW),
  };
}
