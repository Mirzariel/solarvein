/**
 * SolarVein v2 — system time stepper (W2b, phase 2).
 *
 * simulateSystem(): 24 h / 72 h stepping of PV/T collector → router → {DHW preheat, buffer tank, desiccant, bypass}.
 * simulateYear():   weighted typical days (terik / berawan / hujan), each run after a warm-up day.
 * areaSweep():      annual solar heat, bypass and net carbon versus array area and router strategy.
 * baselineInputs(): everything compareBaselines needs.
 *
 * Per step (evaluated at the MIDPOINT of the step; t in DayStep is that midpoint):
 *  1. weather → collector at inlet = tank bottom with the pump forced on (simulate 'pvt-liquid') → available heat.
 *  2. router decides pump + split. The preheat capacity of the collector fluid goes in as `dhwDemandW`.
 *  3. Pump off → the collector is re-run with the pump off (PV runs hotter, no pump power).
 *  4. DHW draw: direct collector heat first, then the tank top through the external HX, then the existing
 *     heater tops up to the setpoint (unmet = 0 by construction).
 *  5. Tank step (charge = accepted share, rejected share is moved to bypass in the reported allocation).
 *  6. Optional heat-pump source mode, desiccant adapter, parasitic electricity.
 *
 * Pure TypeScript; no randomness. Energies are integrated as W·Δt.
 */
import type {
  AnnualResult,
  AreaSweepPoint,
  BaselineInputs,
  ClimatePoint,
  DayResult,
  DayScenarioId,
  DayStep,
  DayTotals,
  RouterState,
  RouterStrategy,
  Sink,
  SystemInputs,
  TankState,
} from './contract';
import { kWhE, kWhTh } from './contract';
import type { SimInputs } from '../types';
import { simulate } from '../model';
import { DESICCANT_HYSTERESIS_K, allocate, inScheduleWindow } from './router';
import { climateAt, dhwDrawAt } from './hotel';
import { DEFAULT_PREHEAT_EFFECTIVENESS, drawCapacityWPerK } from './dhw';
import { initialTank, stepTankDetailed, tankEnergyKWhTh, tankGeometry, tankHeadroomW, tankUaWPerK } from './tank';
import { heatPumpCop } from './heatpump';
import { enthalpyKJkg, humidityRatio } from './psychro';
import { SUPPLY_DB_MARGIN_K, evaluateDesiccant } from './desiccant';
import { compareBaselines } from './carbon';
import { ANNUAL_DAY_WEIGHTS, DEFAULT_DT_H, HP_SOURCE_FLUID_C } from './assumptions/day';

const SINKS: readonly Sink[] = ['dhw', 'tank', 'desiccant', 'bypass'];
/** Remaining DHW demand below this is treated as covered [W_th]. */
const EPS_W = 1e-6;

// ─────────────────────────────────────────────────────────────────────────────
// Desiccant step (W3 evaluateDesiccant wired in) — research hypothesis, reported honestly
// ─────────────────────────────────────────────────────────────────────────────
/** Regeneration air is heated by the loop fluid with this approach: regenC = collector outlet − 3 K (asumsi). */
export const REGEN_HX_APPROACH_K = 3;
/** The fluid cools by about this much in the regeneration air heater before returning to the collector [K] (asumsi). */
export const REGEN_LOOP_DROP_K = 10;
/** Usable water capacity of a regenerated bed [kg water per kg desiccant] (≈ effective swing 0,07–0,13, W3 sweep). */
export const BED_USABLE_CAPACITY_KG_PER_KG = 0.1;
/** Bed state at the start of a scenario [0..1]. */
const INITIAL_BED_CAPACITY = 0.5;

export interface DesiccantStepIn {
  sys: SystemInputs;
  /** Dry capacity at the start of the step [0..1] and the temperature the bed was last regenerated at [°C]. */
  capacity: number;
  bedRegenC: number;
  /** Heat the router sent to the desiccant [W_th]. */
  allocatedW: number;
  /** Collector outlet temperature, i.e. the regeneration temperature on offer [°C]. */
  outletC: number;
  /** PV electricity lost because the loop returns hotter while regenerating [W_e] (0 when not regenerating). */
  pvPenaltyW: number;
  climate: ClimatePoint;
  dtH: number;
}
export interface DesiccantStepOut {
  capacity: number;
  bedRegenC: number;
  /** Heat that actually regenerated the bed [W_th]. */
  regenW: number;
  moistureRemovedKgH: number;
  available: boolean;
  /** Reference-coil electricity for the fresh air [W_e], and with the desiccant path (residual coil +
   *  after-cooler + fans + PV penalty) [W_e]. Equal when the bed does nothing. */
  refWe: number;
  withDesiccantWe: number;
  /** Fans + pump [W_e] inside withDesiccantWe (information only; NOT added to parasitic electricity). */
  parasiticWe: number;
}

/** evaluateDesiccant for the fresh air at the current outdoor state and a regeneration temperature. */
function evalDesiccantAt(sys: SystemInputs, c: ClimatePoint, regenC: number) {
  return evaluateDesiccant({
    regenC,
    process: { tC: c.ambientC, humidityRatio: c.humidityRatio },
    regenAir: sys.desiccant.regenAir,
    ambient: c,
    params: sys.desiccant,
    hotel: sys.hotel,
    carbon: sys.carbon,
    pvPenaltyWe: 0,
    pumpWe: 0,
  });
}

/** Reference coil electricity for the fresh air (same formula as evaluateDesiccant's coilRefWe, no bed needed). */
function refCoilWe(sys: SystemInputs, c: ClimatePoint): number {
  const p = sys.desiccant;
  const mP = Math.max(0, p.processAirKgS ?? sys.hotel.freshAirKgS);
  const wSup = Math.min(humidityRatio(sys.hotel.supplyDewPointC, 1), c.humidityRatio);
  const tSup = Math.min(sys.hotel.supplyDewPointC + SUPPLY_DB_MARGIN_K, c.ambientC);
  const duty = Math.max(0, mP * (enthalpyKJkg(c.ambientC, c.humidityRatio) - enthalpyKJkg(tSup, wSup)));
  return (duty * 1000) / Math.max(1, sys.carbon.coilRefCop);
}

/**
 * One step of the dual-bed desiccant path. Two phases that share the bed's water stock:
 *  - Regeneration (router sent heat AND outlet ≥ desiccantMinRegenC): evaluateDesiccant at regenC = outlet −
 *    approach gives regeneration heat and the water the bed can release per hour; the release is scaled by
 *    allocated heat / regenHeatW (never more than the heat supports) and limited by the room left in the bed.
 *  - Dehumidification (bed has stock and the air needs drying): evaluateDesiccant at the bed's last regeneration
 *    temperature gives the removal rate and the net HVAC electricity; both are scaled by the fraction of that rate
 *    the stock can sustain. Costs are attributed per kg of water removed, plus the PV penalty during regeneration.
 * With an empty bed the reference coil does everything (withDesiccantWe = refWe).
 */
function desiccantStep(i: DesiccantStepIn): DesiccantStepOut {
  const sys = i.sys;
  const p = sys.desiccant;
  const refWe = p.enabled ? refCoilWe(sys, i.climate) : 0;
  const out: DesiccantStepOut = {
    capacity: i.capacity,
    bedRegenC: i.bedRegenC,
    regenW: 0,
    moistureRemovedKgH: 0,
    available: p.enabled && i.capacity > 0.02,
    refWe,
    withDesiccantWe: refWe,
    parasiticWe: 0,
  };
  if (!p.enabled) return out;

  const capKg = Math.max(p.bedMassKg * BED_USABLE_CAPACITY_KG_PER_KG, 1e-9);
  const evalAt = (regenC: number) => evalDesiccantAt(sys, i.climate, regenC);

  let capacity = i.capacity;
  let bedRegenC = i.bedRegenC;
  let penaltyW = 0;

  // Regeneration phase
  if (i.allocatedW > 0 && i.outletC >= sys.controller.desiccantMinRegenC && capacity < 1) {
    const regenC = i.outletC - REGEN_HX_APPROACH_K;
    const ev = evalAt(regenC);
    if (ev.regenHeatW > 0 && ev.moistureRemovedKgH > 0) {
      const f = Math.min(1, i.allocatedW / ev.regenHeatW);
      const wantedKg = ev.moistureRemovedKgH * f * i.dtH;
      const roomKg = (1 - capacity) * capKg;
      const kg = Math.min(wantedKg, roomKg);
      capacity += kg / capKg;
      bedRegenC = regenC;
      out.regenW = ev.regenHeatW * f * (wantedKg > 0 ? kg / wantedKg : 0);
      penaltyW = i.pvPenaltyW;
    }
  }

  // Dehumidification phase
  let savedW = 0;
  if (capacity > 1e-9) {
    const ev = evalAt(bedRegenC);
    if (ev.moistureRemovedKgH > 0 && ev.requiredMoistureKgH > 0) {
      const mD = Math.min(ev.moistureRemovedKgH, (capacity * capKg) / i.dtH);
      const s = mD / ev.moistureRemovedKgH;
      capacity = Math.max(0, capacity - (mD * i.dtH) / capKg);
      out.moistureRemovedKgH = mD;
      savedW = s * ev.hvac.netSavingWe; // ≤ 0 when the path costs more than the coil
      out.parasiticWe = s * (ev.hvac.fanWe + ev.hvac.pumpWe);
    }
  }

  out.capacity = capacity;
  out.bedRegenC = bedRegenC;
  out.available = capacity > 0.02;
  out.withDesiccantWe = refWe - savedW + penaltyW;
  return out;
}

/** Does the outdoor air need dehumidifying below the AC supply dew point? (documented in assumptions/day.ts) */
function airNeedsDrying(sys: SystemInputs, c: ClimatePoint): boolean {
  return c.humidityRatio > humidityRatio(sys.hotel.supplyDewPointC, 1);
}

// ─────────────────────────────────────────────────────────────────────────────
// Accumulators
// ─────────────────────────────────────────────────────────────────────────────
interface Acc {
  pvWh: number;
  parasiticWh: number;
  collectedWh: number;
  demandWh: number;
  solarWh: number;
  backupWh: number;
  unmetWh: number;
  regenWh: number;
  bypassWh: number;
  lossWh: number;
  acceptedWh: number;
  deliveredWh: number;
  moistureKg: number;
  hvacSavedWh: number;
  hpWorkWh: number;
}
const newAcc = (): Acc => ({
  pvWh: 0, parasiticWh: 0, collectedWh: 0, demandWh: 0, solarWh: 0, backupWh: 0, unmetWh: 0, regenWh: 0,
  bypassWh: 0, lossWh: 0, acceptedWh: 0, deliveredWh: 0, moistureKg: 0, hvacSavedWh: 0, hpWorkWh: 0,
});

function totalsOf(a: Acc, deltaKWh: number, withHp: boolean): DayTotals {
  const demand = a.demandWh / 1000;
  const t: DayTotals = {
    pvKWhE: kWhE(a.pvWh / 1000),
    parasiticKWhE: kWhE(a.parasiticWh / 1000),
    collectedKWhTh: kWhTh(a.collectedWh / 1000),
    dhwDemandKWhTh: kWhTh(demand),
    dhwSolarKWhTh: kWhTh(a.solarWh / 1000),
    dhwBackupKWhTh: kWhTh(a.backupWh / 1000),
    unmetKWhTh: kWhTh(a.unmetWh / 1000),
    desiccantRegenKWhTh: kWhTh(a.regenWh / 1000),
    bypassKWhTh: kWhTh(a.bypassWh / 1000),
    tankLossKWhTh: kWhTh(a.lossWh / 1000),
    tankDeltaKWhTh: kWhTh(deltaKWh),
    solarFraction: demand > 0 ? a.solarWh / 1000 / demand : 0,
    moistureRemovedKg: a.moistureKg,
    hvacSavedKWhE: kWhE(a.hvacSavedWh / 1000),
  };
  if (withHp) t.heatPumpWorkKWhE = kWhE(a.hpWorkWh / 1000);
  return t;
}

/** k × totals (all extensive fields); solarFraction recomputed. */
function scaleTotals(t: DayTotals, k: number): DayTotals {
  const demand = t.dhwDemandKWhTh * k;
  const out: DayTotals = {
    pvKWhE: kWhE(t.pvKWhE * k),
    parasiticKWhE: kWhE(t.parasiticKWhE * k),
    collectedKWhTh: kWhTh(t.collectedKWhTh * k),
    dhwDemandKWhTh: kWhTh(demand),
    dhwSolarKWhTh: kWhTh(t.dhwSolarKWhTh * k),
    dhwBackupKWhTh: kWhTh(t.dhwBackupKWhTh * k),
    unmetKWhTh: kWhTh(t.unmetKWhTh * k),
    desiccantRegenKWhTh: kWhTh(t.desiccantRegenKWhTh * k),
    bypassKWhTh: kWhTh(t.bypassKWhTh * k),
    tankLossKWhTh: kWhTh(t.tankLossKWhTh * k),
    tankDeltaKWhTh: kWhTh(t.tankDeltaKWhTh * k),
    solarFraction: demand > 0 ? (t.dhwSolarKWhTh * k) / demand : 0,
    moistureRemovedKg: t.moistureRemovedKg * k,
    hvacSavedKWhE: kWhE(t.hvacSavedKWhE * k),
  };
  if (t.heatPumpWorkKWhE !== undefined) out.heatPumpWorkKWhE = kWhE(t.heatPumpWorkKWhE * k);
  return out;
}

function addTotals(a: DayTotals, b: DayTotals): DayTotals {
  const demand = a.dhwDemandKWhTh + b.dhwDemandKWhTh;
  const solar = a.dhwSolarKWhTh + b.dhwSolarKWhTh;
  const out: DayTotals = {
    pvKWhE: kWhE(a.pvKWhE + b.pvKWhE),
    parasiticKWhE: kWhE(a.parasiticKWhE + b.parasiticKWhE),
    collectedKWhTh: kWhTh(a.collectedKWhTh + b.collectedKWhTh),
    dhwDemandKWhTh: kWhTh(demand),
    dhwSolarKWhTh: kWhTh(solar),
    dhwBackupKWhTh: kWhTh(a.dhwBackupKWhTh + b.dhwBackupKWhTh),
    unmetKWhTh: kWhTh(a.unmetKWhTh + b.unmetKWhTh),
    desiccantRegenKWhTh: kWhTh(a.desiccantRegenKWhTh + b.desiccantRegenKWhTh),
    bypassKWhTh: kWhTh(a.bypassKWhTh + b.bypassKWhTh),
    tankLossKWhTh: kWhTh(a.tankLossKWhTh + b.tankLossKWhTh),
    tankDeltaKWhTh: kWhTh(a.tankDeltaKWhTh + b.tankDeltaKWhTh),
    solarFraction: demand > 0 ? solar / demand : 0,
    moistureRemovedKg: a.moistureRemovedKg + b.moistureRemovedKg,
    hvacSavedKWhE: kWhE(a.hvacSavedKWhE + b.hvacSavedKWhE),
  };
  if (a.heatPumpWorkKWhE !== undefined || b.heatPumpWorkKWhE !== undefined) {
    out.heatPumpWorkKWhE = kWhE((a.heatPumpWorkKWhE ?? 0) + (b.heatPumpWorkKWhE ?? 0));
  }
  return out;
}

// ─────────────────────────────────────────────────────────────────────────────
// Core stepper
// ─────────────────────────────────────────────────────────────────────────────
interface Carry {
  tank: TankState;
  router: RouterState | undefined;
  capacity: number;
  bedRegenC: number;
  /** Hours the pump has been running continuously (0 when off). */
  pumpRunH: number;
}

interface PhaseResult {
  steps: DayStep[];
  acc: Acc;
  carry: Carry;
  tank0KWh: number;
  tank1KWh: number;
}

function normalise(r: RouterState): void {
  for (const s of SINKS) if (r.allocW[s] < 0) r.allocW[s] = 0;
}

/** Tank accepts collector heat only if the charge fluid exceeds the tank bottom by this margin [K] (asumsi). */
export const TANK_ACCEPT_MARGIN_K = 1;
/** Dry-cooler (bypass) return temperature above ambient [K] (asumsi). */
export const DUMP_APPROACH_K = 8;
/** Minimum pump run time after a start, against short cycling [h] (asumsi). */
export const PUMP_MIN_RUN_H = 0.5;

/** Extra per-step DHW chain facts (same objects as DayStep.dhw; proposed for the contract). */
export interface DhwChainDetail {
  /** Potable temperature leaving the solar HX chain, before the existing heater [°C]. */
  potableOutC: number;
  /** Source temperatures offered to the chain: tank top at the start of the step, collector fluid outlet [°C]. */
  tankSourceC: number;
  collectorSourceC: number;
}
export type DayStepDetail = DayStep & { dhw: DayStep['dhw'] & DhwChainDetail };

/**
 * Heat passed by ONE external HX stage in a series chain [W_th]: Q = eps*C*(T_src - T_in), capped so the potable
 * outlet never exceeds min(T_src, setpoint) (second law). C is the potable capacity rate [W/K].
 */
export function hxStageW(cW: number, srcC: number, inC: number, setpointC: number, eps: number): number {
  if (!(cW > 0) || !(srcC > inC)) return 0;
  const q = eps * cW * (srcC - inC);
  const cap = cW * (Math.min(srcC, setpointC) - inC);
  return Math.max(Math.min(q, cap), 0);
}

/** State of charge normalised between mains and the useful maximum (DHW setpoint) [0..1]. */
function usefulSoc(s: Pick<TankState, 'topC' | 'bottomC'>, mainsC: number, setpointC: number): number {
  const span = Math.max(setpointC - mainsC, 1e-9);
  return Math.min(Math.max(((s.topC + s.bottomC) / 2 - mainsC) / span, 0), 1);
}

function runPhase(
  sys: SystemInputs,
  strategy: RouterStrategy,
  climateFn: (t: number) => ClimatePoint,
  hours: number,
  dtH: number,
  carry: Carry,
  record: boolean,
): PhaseResult {
  const { hotel, array, tank: tankP } = sys;
  const mod = array.module;
  const modules = array.modules;
  const derate = array.systemDerate;
  const params = { ...sys.controller, strategy };
  const nSteps = Math.max(1, Math.round(hours / dtH));
  const acc = newAcc();
  const steps: DayStep[] = [];
  const aperture = modules * mod.areaM2;
  const hpOn = sys.heatPumpSource.enabled;
  const Tm = hotel.mainsC;
  const Ts = hotel.dhwSetpointC;
  const eps = DEFAULT_PREHEAT_EFFECTIVENESS;

  let tank = carry.tank;
  let prev = carry.router;
  let capacity = carry.capacity;
  let bedRegenC = carry.bedRegenC;
  let pumpRunH = carry.pumpRunH;
  const tank0KWh = tankEnergyKWhTh(tank, tankP, Tm);

  for (let i = 0; i < nSteps; i++) {
    const tMid = (i + 0.5) * dtH;
    const hourOfDay = ((tMid % 24) + 24) % 24;
    const clim = climateFn(tMid);
    const draw = dhwDrawAt(hotel, hourOfDay);
    const G = clim.irradiance;
    const cDraw = drawCapacityWPerK(draw.drawLph);

    const modIn = (inletC: number, pump: 'on' | 'off'): SimInputs => ({
      ...mod,
      irradiance: G,
      ambientC: clim.ambientC,
      windMs: clim.windMs,
      rainMmH: clim.rainMmH,
      humidityRatio: clim.humidityRatio,
      inletC,
      pumpControl: pump,
    });
    type Sim = ReturnType<typeof simulate>;
    const run = (inletC: number): Sim => simulate(modIn(inletC, 'on'), 'pvt-liquid');

    // 1. collector candidates
    const bottom = tank.bottomC;
    const simNom: Sim | null = G > 0 ? run(bottom) : null; // pump forced on, loop returns at the tank bottom
    const simOff: Sim | null = G > 0 ? simulate(modIn(bottom, 'off'), 'pvt-liquid') : null; // stagnant
    const outletNom = simNom ? simNom.outletC : bottom;
    const headW = simNom ? tankHeadroomW(tank, tankP, dtH, outletNom) : 0;
    const canAccept = !!simNom && outletNom - bottom > TANK_ACCEPT_MARGIN_K && headW > 0;

    const wantDes = sys.desiccant.enabled && capacity < 0.999 && airNeedsDrying(sys, clim);
    const prevDes = (prev?.allocW.desiccant ?? 0) > 0;
    const minRegenC = params.desiccantMinRegenC - (prevDes ? DESICCANT_HYSTERESIS_K : 0);
    const inletAlt = Math.min(bottom, clim.ambientC + DUMP_APPROACH_K);

    let route: 'tank' | 'desiccant' | 'dump' = canAccept ? 'tank' : 'dump';
    let inletC = bottom;
    let simSel: Sim | null = simNom;
    let simDump: Sim | null = null;
    let desiccantPreferred: boolean | undefined;

    if (simNom) {
      const dump = (): Sim => (simDump ??= run(inletAlt));
      if (strategy === 'fixed-schedule' && wantDes && inScheduleWindow(hourOfDay)) {
        // naive: the clock sends everything to the desiccant, whatever the temperature or the value
        route = 'desiccant';
        inletC = Math.min(bottom, Math.max(inletAlt, outletNom - REGEN_LOOP_DROP_K));
        simSel = run(inletC);
      } else if (strategy === 'adaptive' && wantDes && (!canAccept || headW < Math.max(0, simNom.qLiquidW) * modules)) {
        // value gate: desiccant only if its saved kWh_e per kWh_th beats the PV gain of dumping the heat instead
        const inletD = canAccept ? bottom : Math.min(bottom, Math.max(inletAlt, outletNom - REGEN_LOOP_DROP_K));
        const simD = inletD === bottom ? simNom : run(inletD);
        let ok = false;
        if (simD.outletC >= minRegenC) {
          const ev = evalDesiccantAt(sys, clim, simD.outletC - REGEN_HX_APPROACH_K);
          const gain = Math.max(0, (dump().electricalW - simD.electricalW) * derate) / Math.max(simD.qLiquidW, 1);
          ok = ev.operating && ev.savedKWhEPerKWhTh > gain;
        }
        desiccantPreferred = ok;
        if (!canAccept) {
          if (ok) {
            route = 'desiccant';
            inletC = inletD;
            simSel = simD;
          } else {
            inletC = inletAlt;
            simSel = dump();
          }
        }
      } else if (!canAccept) {
        inletC = inletAlt;
        simSel = dump();
      }
    }

    const qSel = simSel ? Math.max(0, simSel.qLiquidW) * modules : 0;
    const outletSel = simSel ? simSel.outletC : inletC;

    // 2. DHW series chain: mains -> cooler source -> hotter source -> existing heater
    const tankFirst = tank.topC <= outletSel;
    let tankReq0 = 0;
    let directCapW: number;
    if (tankFirst) {
      tankReq0 = hxStageW(cDraw, tank.topC, Tm, Ts, eps);
      directCapW = hxStageW(cDraw, outletSel, Tm + (cDraw > 0 ? tankReq0 / cDraw : 0), Ts, eps);
    } else {
      directCapW = hxStageW(cDraw, outletSel, Tm, Ts, eps);
    }

    // Bypassing (cooling the cells) is run only if the PV gain beats the pump power; heat for the draw always may.
    let qPass = qSel;
    if (simSel && route === 'dump') {
      const gainW = (simSel.electricalW - (simOff ? simOff.electricalW : 0)) * derate * modules;
      const worth = gainW - simSel.pumpW * modules > 0;
      if (!worth && directCapW <= 0) qPass = 0;
    }

    // 3. thermostat: the SAME sensor (absorber/cell temperature) for start and stop
    const prevOn = prev?.pumpOn === true;
    let sensorC = prevOn ? (simSel ? simSel.cellC : clim.ambientC) : simOff ? simOff.cellC : clim.ambientC;
    if (prevOn && pumpRunH < PUMP_MIN_RUN_H) {
      // anti-short-cycling; a collector that delivers no heat (q <= 0) still stops: the router needs q > 0
      sensorC = Math.max(sensorC, inletC + params.offK + 1e-6);
    }

    const router = allocate({
      qAvailableW: qPass,
      collectorOutletC: sensorC,
      tankTopC: tank.topC,
      tankBottomC: inletC,
      tankMaxC: tankP.maxC,
      dhwDemandW: directCapW,
      desiccantWanted: wantDes,
      irradiance: G,
      hourOfDay,
      params,
      prev,
      tankAcceptW: route === 'tank' ? headW : 0,
      desiccantPreferred,
      regenSourceC: outletSel,
    });
    normalise(router);

    // 4. collector result actually used (PV derated; pump off: hotter PV, no pump power)
    let col = {
      inletC,
      outletC: router.pumpOn ? outletSel : inletC,
      cellC: clim.ambientC,
      electricalW: 0,
      qLiquidW: router.pumpOn ? qPass : 0,
      pumpW: 0,
      etaThermal: 0,
      etaElectrical: 0,
    };
    if (router.pumpOn && simSel) {
      col.cellC = simSel.cellC;
      col.electricalW = simSel.electricalW * modules * derate;
      col.pumpW = simSel.pumpW * modules;
    } else if (simOff) {
      col.cellC = simOff.cellC;
      col.electricalW = simOff.electricalW * modules * derate;
    }

    // 5. DHW draw
    const directW = router.allocW.dhw;
    let tankReq: number;
    if (tankFirst) tankReq = tankReq0;
    else tankReq = hxStageW(cDraw, tank.topC, Tm + (cDraw > 0 ? directW / cDraw : 0), Ts, eps);
    tankReq = Math.min(tankReq, Math.max(0, draw.demandW - directW));

    const chargeReqW = router.allocW.tank;
    const ts = stepTankDetailed(
      tank,
      tankP,
      { chargeW: chargeReqW, chargeC: outletSel, dischargeW: tankReq, mainsC: Tm, ambientC: clim.ambientC },
      dtH,
    );
    const acceptedW = Math.min(chargeReqW, ts.acceptedChargeW);
    const rejectedW = Math.max(0, chargeReqW - acceptedW);
    router.allocW.tank = acceptedW;
    router.allocW.bypass += rejectedW;
    if (router.pumpOn && qPass > 0) {
      for (const s of SINKS) router.valves[s] = router.allocW[s] / qPass;
    }
    const topSourceC = tank.topC;
    tank = ts.state;

    const fromTankW = Math.min(ts.deliveredDischargeW, tankReq);
    let solarW = directW + fromTankW;
    let backupW = Math.max(0, draw.demandW - solarW);
    const potableOutC = cDraw > 0 ? Tm + solarW / cDraw : Tm;

    // 6. heat-pump source option (research): collector as source when it cannot harvest and the tank cannot cover
    let heatPump: DayStep['heatPump'];
    if (hpOn) {
      let hp = { on: false, cop: 0, sourceW: 0, workWe: 0 };
      if (!router.pumpOn && backupW > EPS_W) {
        const simHp = run(HP_SOURCE_FLUID_C);
        const qSrc = Math.max(0, simHp.qLiquidW) * modules;
        const cop = heatPumpCop(HP_SOURCE_FLUID_C, Ts, sys.heatPumpSource.carnotFraction);
        if (qSrc > 0 && cop > 1 + 1e-9) {
          const condMax = (qSrc * cop) / (cop - 1);
          const cond = Math.min(condMax, backupW);
          const work = cond / cop;
          const source = cond - work;
          hp = { on: cond > EPS_W, cop, sourceW: source, workWe: work };
          if (hp.on) {
            solarW += cond;
            backupW = Math.max(0, backupW - cond);
            col = {
              inletC: HP_SOURCE_FLUID_C,
              outletC: simHp.outletC,
              cellC: simHp.cellC,
              electricalW: simHp.electricalW * modules * derate,
              qLiquidW: source,
              pumpW: simHp.pumpW * modules,
              etaThermal: 0,
              etaElectrical: 0,
            };
          }
        }
      }
      heatPump = hp;
    }

    // 7. desiccant path
    let pvPenaltyW = 0;
    if (simSel && router.allocW.desiccant > 0 && outletSel >= params.desiccantMinRegenC) {
      const regenC = outletSel - REGEN_HX_APPROACH_K;
      const hotIn = Math.max(inletC, regenC - REGEN_LOOP_DROP_K);
      const hot = run(hotIn);
      pvPenaltyW = Math.max(0, simSel.electricalW - hot.electricalW) * modules * derate * router.valves.desiccant;
    }
    const dz = desiccantStep({
      sys,
      capacity,
      bedRegenC,
      allocatedW: router.allocW.desiccant,
      outletC: outletSel,
      pvPenaltyW,
      climate: clim,
      dtH,
    });
    capacity = dz.capacity;
    bedRegenC = dz.bedRegenC;

    col.etaThermal = G > 0 && aperture > 0 ? col.qLiquidW / (G * aperture) : 0;
    col.etaElectrical = G > 0 && aperture > 0 ? col.electricalW / (G * aperture) : 0;

    // accumulate [Wh]
    const k = dtH;
    acc.pvWh += col.electricalW * k;
    acc.parasiticWh += col.pumpW * k; // circulation pump(s) only; desiccant fans live inside hvacSaved
    if (router.pumpOn) acc.collectedWh += qPass * k;
    acc.demandWh += draw.demandW * k;
    acc.solarWh += solarW * k;
    acc.backupWh += backupW * k;
    acc.regenWh += router.allocW.desiccant * k;
    acc.bypassWh += router.allocW.bypass * k;
    acc.lossWh += ts.lossW * k;
    acc.acceptedWh += acceptedW * k;
    acc.deliveredWh += fromTankW * k;
    acc.moistureKg += dz.moistureRemovedKgH * k;
    acc.hvacSavedWh += (dz.refWe - dz.withDesiccantWe) * k; // net incl. fans, after-cooler, PV penalty
    if (heatPump) acc.hpWorkWh += heatPump.workWe * k;

    if (record) {
      const step: DayStepDetail = {
        t: tMid,
        hourOfDay,
        climate: clim,
        router,
        collector: col,
        tank: { ...tank, soc: usefulSoc(tank, Tm, Ts) },
        dhw: {
          drawLph: draw.drawLph,
          demandW: draw.demandW,
          fromCollectorW: directW,
          fromTankW,
          backupW,
          unmetW: 0,
          potableOutC,
          tankSourceC: topSourceC,
          collectorSourceC: outletSel,
        },
        desiccant: {
          capacity: dz.capacity,
          regenW: dz.regenW,
          moistureRemovedKgH: dz.moistureRemovedKgH,
          available: dz.available,
        },
        hvac: { refWe: dz.refWe, withDesiccantWe: dz.withDesiccantWe },
      };
      if (heatPump) step.heatPump = heatPump;
      steps.push(step);
    }
    pumpRunH = router.pumpOn ? (prevOn ? pumpRunH + dtH : dtH) : 0;
    prev = router;
  }

  return {
    steps,
    acc,
    carry: { tank, router: prev, capacity, bedRegenC, pumpRunH },
    tank0KWh,
    tank1KWh: tankEnergyKWhTh(tank, tankP, Tm),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────────────────────
export interface SimulateSystemOpts {
  strategy?: RouterStrategy;
  /** Step length [h]; default 0,25. */
  dtH?: number;
  /** Fixed number of warm-up days that are run but not recorded (default: until the tank is periodic, 2-14 days; see assumptions/day.ts). */
  warmUpDays?: number;
  /** Start tank state (skips the default initial tank). */
  initialTank?: TankState;
}

interface ScenarioPlan {
  hours: number;
  climate: (t: number) => ClimatePoint;
  warm: (t: number) => ClimatePoint;
}

function planFor(scenario: DayScenarioId): ScenarioPlan {
  if (scenario === 'hujan-3-hari') {
    return {
      hours: 72,
      climate: (t) => climateAt('hujan-3-hari', t),
      warm: (t) => climateAt('berawan', t),
    };
  }
  return { hours: 24, climate: (t) => climateAt(scenario, t), warm: (t) => climateAt(scenario, t) };
}

/** Warm-up runs until the daily tank energy change is below tolerance: at least 2 and at most 14 days. */
const WARM_UP_MIN_DAYS = 2;
const WARM_UP_MAX_DAYS = 14;

/**
 * Repeat the warm-up weather until the tank is (nearly) periodic: |change of stored heat over one day| below
 * 0,2 % of the daily DHW demand (floor 0,05 kWh), or the day limit. A big tank with little demand converges slowly.
 */
function warmUpToPeriodic(
  sys: SystemInputs,
  strategy: RouterStrategy,
  climate: (t: number) => ClimatePoint,
  dtH: number,
  start: Carry,
): Carry {
  let carry = start;
  for (let d = 1; d <= WARM_UP_MAX_DAYS; d++) {
    const r = runPhase(sys, strategy, climate, 24, dtH, carry, false);
    carry = r.carry;
    const tol = Math.max(0.05, 0.002 * (r.acc.demandWh / 1000));
    if (d >= WARM_UP_MIN_DAYS && Math.abs(r.tank1KWh - r.tank0KWh) < tol) break;
  }
  return carry;
}

const startCarry = (sys: SystemInputs): Carry => ({
  tank: initialTank(sys.tank, sys.hotel.mainsC),
  router: undefined,
  capacity: INITIAL_BED_CAPACITY,
  bedRegenC: sys.controller.desiccantMinRegenC,
  pumpRunH: 0,
});

export function simulateSystem(
  sys: SystemInputs,
  scenario: DayScenarioId,
  opts: SimulateSystemOpts = {},
): DayResult {
  const strategy = opts.strategy ?? sys.controller.strategy;
  const dtH = opts.dtH ?? DEFAULT_DT_H;
  const plan = planFor(scenario);
  let carry = startCarry(sys);
  if (opts.initialTank) carry = { ...carry, tank: opts.initialTank };
  if (opts.warmUpDays === undefined) carry = warmUpToPeriodic(sys, strategy, plan.warm, dtH, carry);
  else if (opts.warmUpDays > 0) carry = runPhase(sys, strategy, plan.warm, 24 * Math.floor(opts.warmUpDays), dtH, carry, false).carry;
  const r = runPhase(sys, strategy, plan.climate, plan.hours, dtH, carry, true);
  const delta = r.tank1KWh - r.tank0KWh;
  const closure = delta - (r.acc.acceptedWh - r.acc.deliveredWh - r.acc.lossWh) / 1000;
  return {
    scenario,
    strategy,
    dtH,
    steps: r.steps,
    totals: totalsOf(r.acc, delta, sys.heatPumpSource.enabled),
    energyClosureErrorKWh: closure,
  };
}

/** Annual totals from typical days × days/year (tank state from a same-type warm-up day). */
export function simulateYear(sys: SystemInputs, strategy?: RouterStrategy, dtH: number = DEFAULT_DT_H): AnnualResult {
  const strat = strategy ?? sys.controller.strategy;
  let totals: DayTotals | undefined;
  for (const w of ANNUAL_DAY_WEIGHTS) {
    const plan = planFor(w.scenario);
    const warmed = warmUpToPeriodic(sys, strat, plan.warm, dtH, startCarry(sys));
    const r = runPhase(sys, strat, plan.climate, plan.hours, dtH, warmed, false);
    const day = scaleTotals(totalsOf(r.acc, r.tank1KWh - r.tank0KWh, sys.heatPumpSource.enabled), w.days);
    totals = totals ? addTotals(totals, day) : day;
  }
  return {
    weights: ANNUAL_DAY_WEIGHTS.map((w) => ({ ...w })),
    strategy: strat,
    totals: totals as DayTotals,
  };
}

/** Annual electricity [kWh_e] of the same array run as plain PV (own cell temperature, no heat extraction), after the system derate. */
function conventionalPvKWhE(sys: SystemInputs, dtH: number): number {
  let kWh = 0;
  for (const w of ANNUAL_DAY_WEIGHTS) {
    const n = Math.round(24 / dtH);
    let wh = 0;
    for (let i = 0; i < n; i++) {
      const c = climateAt(w.scenario, (i + 0.5) * dtH);
      if (c.irradiance <= 0) continue;
      const r = simulate(
        {
          ...sys.array.module,
          irradiance: c.irradiance,
          ambientC: c.ambientC,
          windMs: c.windMs,
          rainMmH: c.rainMmH,
          humidityRatio: c.humidityRatio,
          pumpControl: 'off',
        },
        'conventional-pv',
      );
      wh += r.electricalW * sys.array.modules * sys.array.systemDerate * dtH;
    }
    kWh += (wh / 1000) * w.days;
  }
  return kWh;
}

function buildBaselineInputs(
  sys: SystemInputs,
  solarvein: AnnualResult,
  shared?: { pvtDhwOnly: AnnualResult; conventionalPv: number },
): BaselineInputs {
  const pvtDhwOnly =
    shared?.pvtDhwOnly ??
    simulateYear(
      {
        ...sys,
        desiccant: { ...sys.desiccant, enabled: false },
        heatPumpSource: { ...sys.heatPumpSource, enabled: false },
        controller: { ...sys.controller, strategy: 'dhw-priority' },
      },
      'dhw-priority',
    );
  return {
    solarvein,
    pvtDhwOnly,
    conventionalPvKWhEPerYear: kWhE(shared?.conventionalPv ?? conventionalPvKWhE(sys, DEFAULT_DT_H)),
    dhwDemandKWhThPerYear: solarvein.totals.dhwDemandKWhTh,
    areaM2: sys.array.modules * sys.array.module.areaM2,
  };
}

/** Inputs for compareBaselines: SolarVein (sys.controller.strategy), B3 (DHW-priority, no desiccant), plain PV. */
export function baselineInputs(sys: SystemInputs): BaselineInputs {
  return buildBaselineInputs(sys, simulateYear(sys, sys.controller.strategy));
}

/** Copy of `sys` with the array resized to `areaM2`; the tank keeps the same L/m² and surface U-value. */
function resized(sys: SystemInputs, areaM2: number): SystemInputs {
  const baseArea = sys.array.modules * sys.array.module.areaM2;
  const volumeL = baseArea > 0 ? (sys.tank.volumeL * areaM2) / baseArea : sys.tank.volumeL;
  const uSurface = sys.tank.uaWPerK / tankGeometry(sys.tank.volumeL).surfaceM2;
  return {
    ...sys,
    array: { ...sys.array, modules: areaM2 / sys.array.module.areaM2 },
    tank: { ...sys.tank, volumeL, uaWPerK: tankUaWPerK(volumeL, uSurface) },
  };
}

/**
 * Annual solar heat, bypassed heat and net carbon (vs B1) for each array area × strategy. The tank is resized
 * with the array (same L/m² and surface U); fractional module counts are allowed.
 */
export function areaSweep(
  sys: SystemInputs,
  areasM2: number[],
  strategies: RouterStrategy[],
): AreaSweepPoint[] {
  const out: AreaSweepPoint[] = [];
  for (const areaM2 of areasM2) {
    const s = resized(sys, areaM2);
    const shared = {
      pvtDhwOnly: simulateYear(
        {
          ...s,
          desiccant: { ...s.desiccant, enabled: false },
          heatPumpSource: { ...s.heatPumpSource, enabled: false },
          controller: { ...s.controller, strategy: 'dhw-priority' },
        },
        'dhw-priority',
      ),
      conventionalPv: conventionalPvKWhE(s, DEFAULT_DT_H),
    };
    for (const strategy of strategies) {
      const sv = simulateYear(s, strategy);
      const sysS: SystemInputs = { ...s, controller: { ...s.controller, strategy } };
      const cmp = compareBaselines(sysS, buildBaselineInputs(sysS, sv, shared));
      out.push({
        areaM2,
        strategy,
        dhwSolarKWhThPerYear: sv.totals.dhwSolarKWhTh,
        bypassKWhThPerYear: sv.totals.bypassKWhTh,
        netKgPerYear: cmp.ledgers.B1.netKgPerYear,
      });
    }
  }
  return out;
}
