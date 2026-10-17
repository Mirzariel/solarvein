/**
 * SolarVein v2 — adaptive thermal router (W2b). Pure, deterministic, explainable.
 *
 * allocate() decides, for one instant, where the heat the running collector could deliver goes:
 * DHW preheat (direct), buffer tank, desiccant regeneration (research hypothesis) or bypass.
 *
 *  - Pump: runs only while T_collector_outlet − T_tank_bottom exceeds onK (offK once running).
 *    A cold collector therefore never cools the tank ("safe controller").
 *  - Mode A/B/C is a STATE computed from conditions (irradiance, pump, available heat), never the clock.
 *    Only the 'fixed-schedule' strategy reads hourOfDay — that is exactly what makes it the naive baseline.
 *  - Σ allocW = qAvailableW when the pump is on (bypass is the exact remainder); valves = alloc / q.
 *  - Ranking basis for 'adaptive': value per kWh_th — DHW (displaces LPG/electric heater) > tank (stored
 *    for later DHW, minus losses) > desiccant (≲ 0, research) > bypass (0). See assumptions/router.ts.
 */
import type { ControllerMode, RouterInput, RouterReason, RouterState, Sink } from './contract';

/** Below this plane-of-array irradiance there is no useful collection → mode C [W/m²]. */
export const IRRADIANCE_COLLECT_MIN = 20;
/** Tank counts as full when T_top ≥ tankMaxC − this margin [K]. */
export const TANK_FULL_MARGIN_K = 1;
/** Desiccant regeneration continues until the outlet falls this far below the minimum [K]. */
export const DESICCANT_HYSTERESIS_K = 2;
/** Fixed-schedule window for desiccant regeneration [h, local]; start inclusive, end exclusive. */
export const SCHEDULE_START_H = 11;
export const SCHEDULE_END_H = 15;
/** Stored water above this temperature [°C] still counts as usable heat for DHW (mains ≈ 26–28 °C). */
export const STORED_HEAT_USEFUL_C = 32;

const SINK_ORDER: readonly Sink[] = ['dhw', 'tank', 'desiccant', 'bypass'];

function zeros(): Record<Sink, number> {
  return { dhw: 0, desiccant: 0, tank: 0, bypass: 0 };
}

function idleState(mode: ControllerMode, input: RouterInput, demandW: number): RouterState {
  const discharging = demandW > 0 && input.tankTopC > STORED_HEAT_USEFUL_C;
  return {
    mode,
    pumpOn: false,
    allocW: zeros(),
    valves: zeros(),
    reason: discharging ? 'lepas-simpanan' : 'pompa-mati-kolektor-lebih-dingin',
  };
}

/**
 * Optional extensions of RouterInput (kept here so the contract file is untouched; proposed for the contract).
 *  - tankAcceptW: the most heat the tank can take right now at the charge temperature [W_th] — 0 when the
 *    charge fluid is not hotter than the tank bottom by a margin or when there is no headroom. When absent the
 *    legacy rule applies (open while T_top < tankMaxC − 1 K).
 *  - desiccantPreferred: value gate for 'adaptive' (desiccant saved kWh_e per kWh_th beats the PV gain of
 *    dumping the heat). false → the desiccant is skipped; absent → true.
 *  - regenSourceC: temperature compared with desiccantMinRegenC (the real fluid outlet); absent → collectorOutletC
 *    (which, for a thermostat sensor, is a cell temperature).
 */
export interface RouterInputX extends RouterInput {
  tankAcceptW?: number;
  desiccantPreferred?: boolean;
  regenSourceC?: number;
  /**
   * Why the tank takes (all of) no heat, used only to label the bypass reason: 'full' = the tank is (nearly) full
   * → 'tangki-penuh-bypass'; 'cold' = the charge fluid is not warm enough to charge the tank, the heat goes to the
   * dry cooler → 'fluida-belum-cukup-panas'. Absent → 'full' (legacy).
   */
  tankRefusal?: 'full' | 'cold';
}

/** True for 11:00 ≤ hour < 15:00 (the naive 'fixed-schedule' window). */
export function inScheduleWindow(hourOfDay: number): boolean {
  const h = ((hourOfDay % 24) + 24) % 24;
  return h >= SCHEDULE_START_H && h < SCHEDULE_END_H;
}

/**
 * Decide the pump and the heat split for this instant.
 *
 * Thermostat semantics (decided by the caller, day.ts): `input.collectorOutletC` is the collector SENSOR — the
 * absorber/cell temperature: the stagnant one while the pump is off (start, threshold onK) and the running one
 * while it runs (stop, threshold offK) — and `input.tankBottomC` is the lowest available sink return temperature
 * (tank bottom normally; the dump/desiccant return when the tank cannot accept heat). Use `regenSourceC` for the
 * real fluid temperature when the sensor is a cell temperature.
 */
export function allocate(input: RouterInputX): RouterState {
  const { params, prev } = input;
  const q = Number.isFinite(input.qAvailableW) ? Math.max(0, input.qAvailableW) : 0;
  const demand = Number.isFinite(input.dhwDemandW) ? Math.max(0, input.dhwDemandW) : 0;

  // Mode C: not enough light to collect, whatever the strategy.
  if (!(input.irradiance >= IRRADIANCE_COLLECT_MIN)) return idleState('C', input, demand);

  // Pump with hysteresis on the collector-outlet vs tank-bottom temperature difference.
  const dT = input.collectorOutletC - input.tankBottomC;
  const threshold = prev?.pumpOn ? params.offK : params.onK;
  const pumpOn = dT > threshold && q > 0;
  // Mode B: daylight but no useful collection → stored heat only.
  if (!pumpOn) return idleState('B', input, demand);

  const tankCapW =
    input.tankAcceptW !== undefined
      ? Math.max(0, input.tankAcceptW)
      : input.tankTopC < input.tankMaxC - TANK_FULL_MARGIN_K
        ? Infinity
        : 0;
  const regenSourceC = input.regenSourceC ?? input.collectorOutletC;
  const strategy = params.strategy;

  const alloc = zeros();
  let desiccantTooCold = false;
  let scheduled = false;

  if (strategy === 'fixed-schedule' && input.desiccantWanted && inScheduleWindow(input.hourOfDay)) {
    // Naive: the clock decides. Heat goes to the desiccant even if the outlet is below the minimum
    // regeneration temperature — it is then effectively wasted, which is the point of this baseline.
    alloc.desiccant = q;
    scheduled = true;
  } else {
    alloc.dhw = Math.min(q, demand);
    let rest = q - alloc.dhw;
    const toTank = Math.min(rest, tankCapW);
    alloc.tank = toTank;
    rest -= toTank;
    if (rest > 0 && strategy === 'adaptive' && input.desiccantWanted && input.desiccantPreferred !== false) {
      const wasRegenerating = (prev?.allocW.desiccant ?? 0) > 0;
      const minC = params.desiccantMinRegenC - (wasRegenerating ? DESICCANT_HYSTERESIS_K : 0);
      if (regenSourceC >= minC) {
        alloc.desiccant = rest;
        rest = 0;
      } else {
        desiccantTooCold = true;
      }
    }
    alloc.bypass = rest;
  }

  const valves: Record<Sink, number> = {
    dhw: alloc.dhw / q,
    tank: alloc.tank / q,
    desiccant: alloc.desiccant / q,
    bypass: alloc.bypass / q,
  };

  // Reason = reason of the largest allocation; ties broken dhw > tank > desiccant > bypass.
  let main: Sink = 'dhw';
  for (const s of SINK_ORDER) if (alloc[s] > alloc[main]) main = s;
  let reason: RouterReason;
  switch (main) {
    case 'dhw':
      reason = 'prioritas-air-panas';
      break;
    case 'tank':
      reason = 'isi-tangki';
      break;
    case 'desiccant':
      reason = scheduled ? 'jadwal-tetap' : 'regenerasi-desikan';
      break;
    default:
      reason = desiccantTooCold
        ? 'desikan-terlalu-dingin'
        : input.tankRefusal === 'cold'
          ? 'fluida-belum-cukup-panas'
          : 'tangki-penuh-bypass';
  }

  return { mode: 'A', pumpOn: true, allocW: alloc, valves, reason };
}
