/**
 * SolarVein v2 — pure VIEW helpers (W11). Framework-free: no React/DOM/three.
 *
 * Everything the UI sections consume lives here so that no component computes physics or re-runs a simulation
 * on every render. Three layers:
 *   1. Pure functions over a DayResult (stepAt, routerSnapshot, modeBands, pumpStarts, stackedAlloc, cumulative).
 *   2. Small physics-adjacent helpers that call public sim functions (desiccantInputFor, pvGainWePerWth).
 *   3. `createSystemView(sys)` / `getSystemView(sys)`: lazy, memoised getters over the heavy simulations, with
 *      a two-level cache (see `simKey` / `fullKey`).
 */
import type {
  AnnualResult,
  AreaSweepPoint,
  AssumptionEntry,
  BaselineComparison,
  BaselineInputs,
  ClimatePoint,
  ControllerMode,
  DayResult,
  DayScenarioId,
  DayStep,
  DesiccantEvalInput,
  HeatUseValue,
  ModeBand,
  ModeTarget,
  RegenAirSource,
  RouterSnapshot,
  RouterStrategy,
  Sink,
  SystemInputs,
} from './contract';
import { simulate } from '../model';
import { REFERENCES } from '../references';
import type { Reference } from '../references';
import { areaSweep as runAreaSweep, baselineInputs as runBaselineInputs, simulateSystem, simulateYear } from './day';
import { climateAt } from './hotel';
import { desiccantSweep as runDesiccantSweep, evaluateDesiccant } from './desiccant';
import type { DesiccantEvalDetail } from './desiccant';
import { compareBaselines, heatUseValues } from './carbon';
import { CARBON_ASSUMPTIONS } from './assumptions/carbon';
import { DAY_ASSUMPTIONS } from './assumptions/day';
import { DESICCANT_ASSUMPTIONS } from './assumptions/desiccant';
import { DHW_ASSUMPTIONS } from './assumptions/dhw';
import { ECONOMICS_ASSUMPTIONS } from './assumptions/economics';
import { HEATPUMP_ASSUMPTIONS } from './assumptions/heatpump';
import { HOTEL_ASSUMPTIONS } from './assumptions/hotel';
import { ROUTER_ASSUMPTIONS } from './assumptions/router';
import { TANK_ASSUMPTIONS } from './assumptions/tank';

// ─────────────────────────────────────────────────────────────────────────────
// Mode targets
// ─────────────────────────────────────────────────────────────────────────────
/**
 * UI condition presets: a scenario and an hour of day, NOT a promised mode. The router computes the actual
 * mode from irradiance, collector vs tank temperature and demand, so the UI must always DISPLAY the computed
 * mode (`stepAt(...).router.mode`), which can differ from the target letter (e.g. a "Lembap & mendung" preset
 * may compute A if the rainy afternoon still lets the collector out-run the tank bottom).
 *   A = hari terik @ 13:00 · B = hari hujan @ 15:00 · C = hari terik @ 22:00 (no light).
 */
export const MODE_TARGETS: Record<ModeTarget, { scenario: DayScenarioId; hour: number }> = {
  A: { scenario: 'terik', hour: 13 },
  B: { scenario: 'hujan', hour: 15 },
  C: { scenario: 'terik', hour: 22 },
};

// ─────────────────────────────────────────────────────────────────────────────
// Small helpers
// ─────────────────────────────────────────────────────────────────────────────
/** NaN / ±Infinity / null / undefined -> null (e.g. payback years that are Infinity), otherwise the number. */
export function finiteOrNull(x: number | null | undefined): number | null {
  return typeof x === 'number' && Number.isFinite(x) ? x : null;
}

const SINKS: readonly Sink[] = ['dhw', 'tank', 'desiccant', 'bypass'];
const lerp = (a: number, b: number, f: number): number => a + (b - a) * f;

/**
 * Interpolate two structurally identical plain objects: numbers linearly, everything else (booleans, strings,
 * optional/missing members) from the nearer one (`f` < 0.5 -> a, else b).
 */
function lerpDeep<T>(a: T, b: T, f: number): T {
  if (typeof a === 'number' && typeof b === 'number') return lerp(a, b, f) as unknown as T;
  const near = f < 0.5 ? a : b;
  if (a && b && typeof a === 'object' && typeof b === 'object' && !Array.isArray(a) && !Array.isArray(b)) {
    const out: Record<string, unknown> = {};
    for (const k of Object.keys(near as object)) {
      const av = (a as Record<string, unknown>)[k];
      const bv = (b as Record<string, unknown>)[k];
      out[k] = av !== undefined && bv !== undefined ? lerpDeep(av, bv, f) : (near as Record<string, unknown>)[k];
    }
    return out as T;
  }
  return near;
}

const sinkRecord = (v: number): Record<Sink, number> => ({ dhw: v, desiccant: v, tank: v, bypass: v });

/**
 * The step at time `t` [h since scenario start], linearly interpolated between the two neighbouring recorded
 * steps. Recorded steps sit at interval midpoints (0,125 h, 0,375 h, ...), so `t` is clamped to
 * [first.t, last.t]. Numeric fields interpolate; discrete fields (router.mode, router.pumpOn, router.reason,
 * desiccant.available, heatPump.on) come from the nearest step. `hourOfDay` is recomputed from `t` (no wrap
 * artefact at midnight). Router: allocW and valves are interpolated; when the pump is on the valves are
 * renormalised so that Σ = 1; when it is off both are all-zero (as `allocate` returns them).
 */
export function stepAt(day: DayResult, t: number): DayStep {
  const steps = day.steps;
  if (steps.length === 0) throw new Error('stepAt: day has no steps');
  const first = steps[0] as DayStep;
  const last = steps[steps.length - 1] as DayStep;
  const tc = Number.isFinite(t) ? Math.min(last.t, Math.max(first.t, t)) : first.t;

  // Index of the last step with t_i <= tc (steps are uniformly spaced).
  let i = 0;
  if (steps.length > 1) {
    const dt = (last.t - first.t) / (steps.length - 1);
    i = dt > 0 ? Math.min(steps.length - 2, Math.max(0, Math.floor((tc - first.t) / dt + 1e-9))) : 0;
  }
  const a = steps[i] as DayStep;
  const b = (steps[Math.min(i + 1, steps.length - 1)] as DayStep | undefined) ?? a;
  const span = b.t - a.t;
  const f = span > 0 ? Math.min(1, Math.max(0, (tc - a.t) / span)) : 0;
  const near = f < 0.5 ? a : b;

  const out = lerpDeep(a, b, f);
  out.t = tc;
  out.hourOfDay = ((tc % 24) + 24) % 24;
  const router = { ...out.router, mode: near.router.mode, pumpOn: near.router.pumpOn, reason: near.router.reason };
  if (near.router.pumpOn) {
    const sum = SINKS.reduce((s, k) => s + router.valves[k], 0);
    if (sum > 1e-9) {
      if (Math.abs(sum - 1) > 1e-12) {
        router.valves = Object.fromEntries(SINKS.map((k) => [k, router.valves[k] / sum])) as Record<Sink, number>;
      }
    } else {
      router.valves = { ...near.router.valves };
    }
  } else {
    router.valves = sinkRecord(0);
    router.allocW = sinkRecord(0);
  }
  out.router = router;
  return out;
}

/** The router/tank slice the Router diagram, valve animation and caption read. */
export function routerSnapshot(step: DayStep): RouterSnapshot {
  return {
    mode: step.router.mode,
    pumpOn: step.router.pumpOn,
    valves: { ...step.router.valves },
    allocW: { ...step.router.allocW },
    tankSoc: step.tank.soc,
    tankTopC: step.tank.topC,
    reason: step.router.reason,
  };
}

/**
 * Consecutive steps with the same computed mode merged into bands. Band edges are the midpoints between
 * neighbouring step times (the interval boundaries), so the bands tile [first.t − dt/2, last.t + dt/2]
 * (= [0, 24] or [0, 72]) with no gaps or overlaps.
 */
export function modeBands(day: DayResult): ModeBand[] {
  const steps = day.steps;
  if (steps.length === 0) return [];
  const half = day.dtH / 2;
  /** Boundary before step i (i = steps.length: the end). */
  const edge = (i: number): number => {
    if (i <= 0) return (steps[0] as DayStep).t - half;
    if (i >= steps.length) return (steps[steps.length - 1] as DayStep).t + half;
    return ((steps[i - 1] as DayStep).t + (steps[i] as DayStep).t) / 2;
  };
  const bands: ModeBand[] = [];
  let mode: ControllerMode = (steps[0] as DayStep).router.mode;
  let start = 0;
  for (let i = 1; i <= steps.length; i++) {
    if (i === steps.length || (steps[i] as DayStep).router.mode !== mode) {
      bands.push({ mode, t0: edge(start), t1: edge(i) });
      if (i < steps.length) {
        mode = (steps[i] as DayStep).router.mode;
        start = i;
      }
    }
  }
  return bands;
}

/**
 * Number of pump starts in the recorded range: off -> on transitions between consecutive steps (a pump that is
 * already on at the first recorded step is not counted; its start happened before the record).
 */
export function pumpStarts(day: DayResult): number {
  let n = 0;
  for (let i = 1; i < day.steps.length; i++) {
    if ((day.steps[i] as DayStep).router.pumpOn && !(day.steps[i - 1] as DayStep).router.pumpOn) n++;
  }
  return n;
}

export interface StackedAllocPoint {
  t: number;
  /** Heat routed to each sink [W_th]. */
  dhw: number;
  desiccant: number;
  tank: number;
  bypass: number;
  /** DHW heat delivered from the tank top [W_th] and by the existing heater (backup) [W_th]. */
  fromTank: number;
  backup: number;
}

/** Per-step allocation for stacked area charts [W_th]. */
export function stackedAlloc(day: DayResult): StackedAllocPoint[] {
  return day.steps.map((s) => ({
    t: s.t,
    dhw: s.router.allocW.dhw,
    desiccant: s.router.allocW.desiccant,
    tank: s.router.allocW.tank,
    bypass: s.router.allocW.bypass,
    fromTank: s.dhw.fromTankW,
    backup: s.dhw.backupW,
  }));
}

export interface CumulativePoint {
  /** End of the step [h]; the values are running totals through that step. */
  t: number;
  /** Solar-derived DHW heat (collector + tank + heat-pump condenser) = demand − backup [kWh_th]. */
  solarDhwKWhTh: number;
  /** Existing-heater (backup) DHW heat [kWh_th]. */
  backupKWhTh: number;
  /** PV electricity of the array [kWh_e]. */
  pvKWhE: number;
}

/** Running totals per step. Thermal and electrical series stay separate (kWh_th vs kWh_e are never added). */
export function cumulative(day: DayResult): CumulativePoint[] {
  const k = day.dtH / 1000;
  let solar = 0;
  let backup = 0;
  let pv = 0;
  return day.steps.map((s) => {
    solar += Math.max(0, s.dhw.demandW - s.dhw.backupW) * k;
    backup += s.dhw.backupW * k;
    pv += s.collector.electricalW * k;
    return { t: s.t + day.dtH / 2, solarDhwKWhTh: solar, backupKWhTh: backup, pvKWhE: pv };
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Desiccant input + PV gain
// ─────────────────────────────────────────────────────────────────────────────
/**
 * Evaluation input for the desiccant sweeps: process air = outdoor air at (scenario, t), ambient = climateAt,
 * params/hotel/carbon from `sys`. `regenC` is a placeholder (desiccantMinRegenC); sweeps override it.
 * pvPenaltyWe and pumpWe are 0 here, so a standalone sweep OVERSTATES the saving (upper bound). The day
 * simulation charges both per step.
 */
export function desiccantInputFor(
  sys: SystemInputs,
  scenario: DayScenarioId,
  t: number,
  regenAir: RegenAirSource,
): DesiccantEvalInput {
  const ambient: ClimatePoint = climateAt(scenario, t);
  return {
    regenC: sys.controller.desiccantMinRegenC,
    process: { tC: ambient.ambientC, humidityRatio: ambient.humidityRatio },
    regenAir,
    ambient,
    params: { ...sys.desiccant, regenAir },
    hotel: sys.hotel,
    carbon: sys.carbon,
    pvPenaltyWe: 0,
    pumpWe: 0,
  };
}

/** The "typical noon" used by pvGainWePerWth: clear day, 12:00. */
const PV_GAIN_SCENARIO: DayScenarioId = 'terik';
const PV_GAIN_HOUR = 12;
/** Return temperature of the loop in the "heat used" state (tank-ish) [°C]. */
const PV_GAIN_HOT_INLET_C = 40;

/**
 * PV electricity gained per W_th of extra heat removed [W_e per W_th] — feeds `heatUseValues` as
 * 'pv-lebih-dingin' ("dump the heat, run the cells cooler").
 *
 * Definition. At a typical noon (clear day, 12:00; irradiance/ambient/wind from `climateAt`) run the SAME
 * module with the loop pumped in two states via `simulate(..., 'pvt-liquid')`:
 *   · "used"   — inlet 40 °C (tank-bottom-like return: the heat goes to DHW / tank);
 *   · "cooler" — inlet at ambient (heat dumped to a cold sink; never below ambient).
 *   gain = [P_e(cooler) − P_e(used)] · systemDerate / [q_liquid(cooler) − q_liquid(used)]
 * i.e. the marginal PV watts bought per additional thermal watt removed by cooling the return. It is the
 * incremental value of dumping heat over delivering it at 40 °C, not the value of PV cooling per se (the
 * 40 °C state is cooled as well). Returns 0 when the collector gains no extra heat; always finite and ≥ 0.
 */
export function pvGainWePerWth(sys: SystemInputs): number {
  const c = climateAt(PV_GAIN_SCENARIO, PV_GAIN_HOUR);
  const coolC = Math.min(c.ambientC, PV_GAIN_HOT_INLET_C - 5);
  const run = (inletC: number) =>
    simulate(
      {
        ...sys.array.module,
        irradiance: c.irradiance,
        ambientC: c.ambientC,
        windMs: c.windMs,
        rainMmH: c.rainMmH,
        humidityRatio: c.humidityRatio,
        inletC,
        pumpControl: 'on',
      },
      'pvt-liquid',
    );
  const hot = run(PV_GAIN_HOT_INLET_C);
  const cool = run(coolC);
  const dq = cool.qLiquidW - hot.qLiquidW;
  const dp = (cool.electricalW - hot.electricalW) * sys.array.systemDerate;
  const g = dq > 1e-6 ? dp / dq : 0;
  return Number.isFinite(g) ? Math.max(0, g) : 0;
}

// ─────────────────────────────────────────────────────────────────────────────
// Keys
// ─────────────────────────────────────────────────────────────────────────────
function stable(x: unknown): string {
  if (x === null || typeof x !== 'object') {
    if (typeof x === 'number' && !Number.isFinite(x)) return JSON.stringify(String(x));
    return JSON.stringify(x) ?? 'null';
  }
  if (Array.isArray(x)) return `[${x.map(stable).join(',')}]`;
  const o = x as Record<string, unknown>;
  return `{${Object.keys(o)
    .filter((k) => o[k] !== undefined)
    .sort()
    .map((k) => `${JSON.stringify(k)}:${stable(o[k])}`)
    .join(',')}}`;
}

/**
 * Stable structural key over ONLY the slices that influence the day/year/desiccant simulations: hotel, array,
 * tank, desiccant, controller, heatPumpSource, carbon.coilRefCop and carbon.aftercoolerCop. Editing the grid
 * emission factor, tariffs, prices or embodied carbon leaves it unchanged.
 */
export function simKey(sys: SystemInputs): string {
  return stable({
    hotel: sys.hotel,
    array: sys.array,
    tank: sys.tank,
    desiccant: sys.desiccant,
    controller: sys.controller,
    heatPumpSource: sys.heatPumpSource,
    coilRefCop: sys.carbon.coilRefCop,
    aftercoolerCop: sys.carbon.aftercoolerCop,
  });
}

/** Stable structural key over the whole system (carbon + economics ledgers depend on all of it). */
export function fullKey(sys: SystemInputs): string {
  return stable(sys);
}

// ─────────────────────────────────────────────────────────────────────────────
// System view (lazy, memoised)
// ─────────────────────────────────────────────────────────────────────────────
export type AssumptionWithModule = AssumptionEntry & { module: string };

/** Default regeneration temperatures of the Desikan chart [°C]. */
export const DEFAULT_REGEN_TEMPS_C: readonly number[] = [35, 40, 45, 50, 55, 60, 65, 70];
/** Regeneration temperature at which `heatUses` evaluates the desiccant [°C] (mid-range of the sweep). */
export const HEAT_USE_REGEN_C = 60;

export interface SystemView {
  readonly sys: SystemInputs;
  /** 24 h (72 h for 'hujan-3-hari') day; `strategy` defaults to sys.controller.strategy. */
  day(scenario: DayScenarioId, strategy?: RouterStrategy): DayResult;
  year(strategy?: RouterStrategy): AnnualResult;
  baselineInputs(): BaselineInputs;
  baselines(): BaselineComparison;
  /**
   * Desiccant evaluated over regeneration temperatures at the condition `at` (default MODE_TARGETS.A: clear
   * day, 13:00). Upper bound: no PV penalty or pump power (see desiccantInputFor).
   */
  desiccantSweep(
    regenAir: RegenAirSource,
    temps?: readonly number[],
    at?: { scenario: DayScenarioId; t: number },
  ): DesiccantEvalDetail[];
  /** Value of 1 kWh_th in each use; the desiccant is evaluated at HEAT_USE_REGEN_C on the MODE_TARGETS.A condition. */
  heatUses(): HeatUseValue[];
  areaSweep(areasM2: number[], strategies: RouterStrategy[]): AreaSweepPoint[];
  /** Every module's assumptions with a `module` field. */
  assumptions(): AssumptionWithModule[];
  references(): Reference[];
}

/** Caches that depend only on simKey(sys); shared between systems that differ only in carbon/economics edits. */
interface SimCache {
  days: Map<string, DayResult>;
  years: Map<string, AnnualResult>;
  sweeps: Map<string, DesiccantEvalDetail[]>;
  baselineInputs?: BaselineInputs;
  pvGain?: number;
}

const SIM_CACHE_SIZE = 8;
const simCaches = new Map<string, SimCache>();

function simCacheFor(key: string): SimCache {
  let c = simCaches.get(key);
  if (c) {
    simCaches.delete(key);
  } else {
    c = { days: new Map(), years: new Map(), sweeps: new Map() };
  }
  simCaches.set(key, c);
  while (simCaches.size > SIM_CACHE_SIZE) {
    const oldest = simCaches.keys().next().value;
    if (oldest === undefined) break;
    simCaches.delete(oldest);
  }
  return c;
}

function memo<K, V>(m: Map<K, V>, key: K, make: () => V): V {
  if (m.has(key)) return m.get(key) as V;
  const v = make();
  m.set(key, v);
  return v;
}

const ALL_ASSUMPTIONS: [string, AssumptionEntry[]][] = [
  ['hotel', HOTEL_ASSUMPTIONS],
  ['dhw', DHW_ASSUMPTIONS],
  ['tank', TANK_ASSUMPTIONS],
  ['router', ROUTER_ASSUMPTIONS],
  ['day', DAY_ASSUMPTIONS],
  ['heatpump', HEATPUMP_ASSUMPTIONS],
  ['desiccant', DESICCANT_ASSUMPTIONS],
  ['carbon', CARBON_ASSUMPTIONS],
  ['economics', ECONOMICS_ASSUMPTIONS],
];

let assumptionsMemo: AssumptionWithModule[] | undefined;
let referencesMemo: Reference[] | undefined;

/**
 * Lazy memoised view of one system. Each getter computes once per argument key. Simulation-only results (day,
 * year, baselineInputs, desiccantSweep) are cached by `simKey` and shared across views of systems that differ
 * only in carbon/economics fields; ledger-dependent results (baselines, heatUses, areaSweep) are per view.
 */
export function createSystemView(sys: SystemInputs): SystemView {
  const sim = simCacheFor(simKey(sys));
  const own = {
    baselines: undefined as BaselineComparison | undefined,
    heatUses: undefined as HeatUseValue[] | undefined,
    sweeps: new Map<string, AreaSweepPoint[]>(),
  };
  const strat = (s?: RouterStrategy): RouterStrategy => s ?? sys.controller.strategy;

  const view: SystemView = {
    sys,
    day: (scenario, strategy) =>
      memo(sim.days, `${scenario}|${strat(strategy)}`, () => simulateSystem(sys, scenario, { strategy: strat(strategy) })),
    year: (strategy) => memo(sim.years, strat(strategy), () => simulateYear(sys, strat(strategy))),
    baselineInputs: () => (sim.baselineInputs ??= runBaselineInputs(sys)),
    baselines: () => (own.baselines ??= compareBaselines(sys, view.baselineInputs())),
    desiccantSweep: (
      regenAir,
      temps = DEFAULT_REGEN_TEMPS_C,
      at = { scenario: MODE_TARGETS.A.scenario, t: MODE_TARGETS.A.hour },
    ) =>
      memo(sim.sweeps, `${regenAir}|${at.scenario}|${at.t}|${temps.join(',')}`, () =>
        runDesiccantSweep(desiccantInputFor(sys, at.scenario, at.t, regenAir), [...temps]),
      ),
    heatUses: () =>
      (own.heatUses ??= heatUseValues(sys, {
        desiccant: evaluateDesiccant({
          ...desiccantInputFor(sys, MODE_TARGETS.A.scenario, MODE_TARGETS.A.hour, sys.desiccant.regenAir),
          regenC: HEAT_USE_REGEN_C,
        }),
        pvGainWePerWth: (sim.pvGain ??= pvGainWePerWth(sys)),
      })),
    areaSweep: (areasM2, strategies) =>
      memo(own.sweeps, `${areasM2.join(',')}|${strategies.join(',')}`, () => runAreaSweep(sys, areasM2, strategies)),
    assumptions: () =>
      (assumptionsMemo ??= ALL_ASSUMPTIONS.flatMap(([module, list]) => list.map((a) => ({ ...a, module })))),
    references: () => (referencesMemo ??= Object.values(REFERENCES) as Reference[]),
  };
  return view;
}

const VIEW_CACHE_SIZE = 8;
const views = new Map<string, SystemView>();

/** `createSystemView` behind a small LRU (size 8) keyed by `fullKey(sys)`; same content -> same view object. */
export function getSystemView(sys: SystemInputs): SystemView {
  const key = fullKey(sys);
  let v = views.get(key);
  if (v) {
    views.delete(key);
  } else {
    v = createSystemView(sys);
  }
  views.set(key, v);
  while (views.size > VIEW_CACHE_SIZE) {
    const oldest = views.keys().next().value;
    if (oldest === undefined) break;
    views.delete(oldest);
  }
  return v;
}
