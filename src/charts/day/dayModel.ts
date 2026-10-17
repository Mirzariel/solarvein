/**
 * Pure projection of a DayResult into the series the 24 h chart draws (no physics here: only unit scaling and
 * the sim's own view helpers). W -> kW so the axes stay short; kWh_th and kWh_e remain separate series.
 */
import { useMemo } from 'react';
import { cumulative, modeBands, stackedAlloc, type CumulativePoint, type DayResult, type ModeBand } from '../../sim/system';

export interface DayModel {
  /** 24 or 72 [h]. */
  tMax: number;
  /** Step centres [h]. */
  t: number[];
  /** Plane-of-array irradiance [W/m²]. */
  g: number[];
  /** DHW supply split [kW_th]: collector -> DHW now, tank discharge, existing heater (backup). Σ = demand. */
  direct: number[];
  fromTank: number[];
  backup: number[];
  demand: number[];
  /** Heat routed to desiccant regeneration [kW_th] (dashed series; usually 0). */
  desiccant: number[];
  /** Tank state of charge [0..1]. */
  soc: number[];
  /** PV electricity of the array [kW_e]. */
  pv: number[];
  bands: ModeBand[];
  cum: CumulativePoint[];
  maxDemandKW: number;
  maxPvKW: number;
  desiccantUsed: boolean;
}

export function buildDayModel(day: DayResult): DayModel {
  const alloc = stackedAlloc(day);
  const kw = (w: number) => w / 1000;
  const demand = day.steps.map((s) => kw(s.dhw.demandW));
  const pv = day.steps.map((s) => kw(s.collector.electricalW));
  const desiccant = alloc.map((a) => kw(a.desiccant));
  return {
    tMax: Math.round(day.steps.length * day.dtH),
    t: day.steps.map((s) => s.t),
    g: day.steps.map((s) => s.climate.irradiance),
    direct: alloc.map((a) => kw(a.dhw)),
    fromTank: alloc.map((a) => kw(a.fromTank)),
    backup: alloc.map((a) => kw(a.backup)),
    demand,
    desiccant,
    soc: day.steps.map((s) => s.tank.soc),
    pv,
    bands: modeBands(day),
    cum: cumulative(day),
    maxDemandKW: Math.max(0, ...demand),
    maxPvKW: Math.max(0, ...pv),
    desiccantUsed: desiccant.some((v) => v > 1e-6),
  };
}

export const useDayModel = (day: DayResult): DayModel => useMemo(() => buildDayModel(day), [day]);

/** Running totals at hour `t` (linear between the recorded step ends). Zero before the first step ends. */
export function cumulativeAt(model: DayModel, t: number): { solarKWhTh: number; backupKWhTh: number; pvKWhE: number } {
  const c = model.cum;
  if (c.length === 0) return { solarKWhTh: 0, backupKWhTh: 0, pvKWhE: 0 };
  const first = c[0] as CumulativePoint;
  if (t <= 0) return { solarKWhTh: 0, backupKWhTh: 0, pvKWhE: 0 };
  if (t < first.t) {
    const f = t / first.t;
    return { solarKWhTh: first.solarDhwKWhTh * f, backupKWhTh: first.backupKWhTh * f, pvKWhE: first.pvKWhE * f };
  }
  let i = 0;
  while (i < c.length - 1 && (c[i + 1] as CumulativePoint).t <= t) i++;
  const a = c[i] as CumulativePoint;
  const b = (c[i + 1] as CumulativePoint | undefined) ?? a;
  const f = b.t > a.t ? Math.min(1, Math.max(0, (t - a.t) / (b.t - a.t))) : 0;
  const lerp = (x: number, y: number) => x + (y - x) * f;
  return {
    solarKWhTh: lerp(a.solarDhwKWhTh, b.solarDhwKWhTh),
    backupKWhTh: lerp(a.backupKWhTh, b.backupKWhTh),
    pvKWhE: lerp(a.pvKWhE, b.pvKWhE),
  };
}

/** "13:15"; 72 h views wrap at midnight, the 24 h view keeps "24:00" at the end. */
export function clockLabel(hours: number, tMax: number): string {
  const total = Math.round(Math.max(0, hours) * 60);
  const wrap = tMax > 24 ? 24 * 60 : Infinity;
  const m = total >= 24 * 60 && tMax <= 24 ? total : total % wrap;
  const hh = Math.floor(m / 60);
  const mm = m % 60;
  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
}

/** 1-based day number within a multi-day scenario at hour `t`. */
export const dayNumber = (t: number): number => Math.min(3, Math.floor(Math.max(0, t) / 24 - 1e-9) + 1);
