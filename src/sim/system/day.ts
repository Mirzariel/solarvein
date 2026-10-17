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
import { allocate } from './router';
import { climateAt, dhwDrawAt } from './hotel';
import { DEFAULT_PREHEAT_EFFECTIVENESS, preheatW } from './dhw';
import { initialTank, stepTankDetailed, tankEnergyKWhTh, tankUaWPerK, tankGeometry } from './tank';
import { heatPumpCop } from './heatpump';
import { humidityRatio } from './psychro';
import { compareBaselines } from './carbon';
import { ANNUAL_DAY_WEIGHTS, DEFAULT_DT_H, HP_SOURCE_FLUID_C } from './assumptions/day';

const SINKS: readonly Sink[] = ['dhw', 'tank', 'desiccant', 'bypass'];
/** Remaining DHW demand below this is treated as covered [W_th]. */
const EPS_W = 1e-6;

// ─────────────────────────────────────────────────────────────────────────────
// Desiccant adapter (neutral until W3's evaluateDesiccant is wired)
// ─────────────────────────────────────────────────────────────────────────────
export interface DesiccantStepIn {
  sys: SystemInputs;
  /** Dry capacity at the start of the step [0..1]. */
  capacity: number;
  /** Heat the router sent to the desiccant [W_th]. */
  allocatedW: number;
  /** Collector outlet temperature, i.e. the regeneration temperature on offer [°C]. */
  regenC: number;
  climate: ClimatePoint;
  dtH: number;
}
export interface DesiccantStepOut {
  capacity: number;
  /** Heat that actually regenerated the bed [W_th] (0 if the fluid was below desiccantMinRegenC). */
  regenW: number;
  moistureRemovedKgH: number;
  available: boolean;
  /** Electricity of the reference coil [W_e] and with the desiccant path incl. after-cooler + fans [W_e]. */
  refWe: number;
  withDesiccantWe: number;
  /** Desiccant fans + regeneration pump [W_e], counted as parasitic. */
  parasiticWe: number;
}

/** Nominal heat to dry a fully wet bed [kWh_th per kg desiccant]: swing 0,1 kg/kg × ~0,9 kWh/kg water (placeholder). */
const PLACEHOLDER_REGEN_KWH_PER_KG = 0.09;
/** Bed state at the start of a scenario [0..1]. */
const INITIAL_BED_CAPACITY = 0.5;

/**
 * TODO(W3): replace with evaluateDesiccant(...): capacity drawdown by moisture removed (moistureRemovedKgH·dt /
 * (bedMass·swing)), recharge by regeneration, hvac.refWe / withDesiccantWe from the evaluation, fan power as
 * parasitic. Until then the bed only recharges from the heat it receives, nothing is removed and no HVAC
 * electricity changes (refWe = withDesiccantWe), so no desiccant benefit is ever shown.
 */
function desiccantStep(i: DesiccantStepIn): DesiccantStepOut {
  const d = i.sys.desiccant;
  const effectiveW = i.regenC >= i.sys.controller.desiccantMinRegenC ? i.allocatedW : 0;
  const fullKWh = Math.max(d.bedMassKg * PLACEHOLDER_REGEN_KWH_PER_KG, 1e-9);
  const capacity = Math.min(1, i.capacity + (effectiveW * i.dtH) / 1000 / fullKWh);
  return {
    capacity,
    regenW: effectiveW,
    moistureRemovedKgH: 0,
    available: d.enabled && capacity > 0.05,
    refWe: 0,
    withDesiccantWe: 0,
    parasiticWe: 0,
  };
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
  const params = { ...sys.controller, strategy };
  const nSteps = Math.max(1, Math.round(hours / dtH));
  const acc = newAcc();
  const steps: DayStep[] = [];
  const aperture = modules * mod.areaM2;
  const hpOn = sys.heatPumpSource.enabled;

  let tank = carry.tank;
  let prev = carry.router;
  let capacity = carry.capacity;
  const tank0KWh = tankEnergyKWhTh(tank, tankP, hotel.mainsC);

  for (let i = 0; i < nSteps; i++) {
    const tMid = (i + 0.5) * dtH;
    const hourOfDay = ((tMid % 24) + 24) % 24;
    const clim = climateFn(tMid);
    const draw = dhwDrawAt(hotel, hourOfDay);
    const G = clim.irradiance;

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

    // 1. what the running collector would deliver at the tank-bottom return temperature
    const inletC = tank.bottomC;
    const simOn = G > 0 ? simulate(modIn(inletC, 'on'), 'pvt-liquid') : null;
    const qAvailableW = simOn ? Math.max(0, simOn.qLiquidW) * modules : 0;
    const outletC = simOn ? simOn.outletC : inletC;
    const directCapW = preheatW(draw.drawLph, outletC, hotel.mainsC, hotel.dhwSetpointC);

    // 2. router
    const desiccantWanted = sys.desiccant.enabled && capacity < 0.999 && airNeedsDrying(sys, clim);
    const router = allocate({
      qAvailableW,
      collectorOutletC: outletC,
      tankTopC: tank.topC,
      tankBottomC: tank.bottomC,
      tankMaxC: tankP.maxC,
      dhwDemandW: directCapW,
      desiccantWanted,
      irradiance: G,
      hourOfDay,
      params,
      prev,
    });
    normalise(router);

    // 3. collector result actually used (pump off → hotter PV, no pump power)
    let col = {
      inletC,
      outletC: router.pumpOn ? outletC : inletC,
      cellC: clim.ambientC,
      electricalW: 0,
      qLiquidW: router.pumpOn ? qAvailableW : 0,
      pumpW: 0,
      etaThermal: 0,
      etaElectrical: 0,
    };
    if (router.pumpOn && simOn) {
      col.cellC = simOn.cellC;
      col.electricalW = simOn.electricalW * modules;
      col.pumpW = simOn.pumpW * modules;
    } else if (G > 0) {
      const simOff = simulate(modIn(inletC, 'off'), 'pvt-liquid');
      col.cellC = simOff.cellC;
      col.electricalW = simOff.electricalW * modules;
    }

    // 4. DHW: direct heat from the collector, then the tank top through the external HX
    const directW = router.allocW.dhw;
    const topRequestW = Math.min(
      Math.max(0, draw.demandW - directW),
      preheatW(draw.drawLph, tank.topC, hotel.mainsC, hotel.dhwSetpointC),
    );

    // 5. tank
    const chargeReqW = router.allocW.tank;
    const ts = stepTankDetailed(
      tank,
      tankP,
      {
        chargeW: chargeReqW,
        chargeC: outletC,
        dischargeW: topRequestW,
        mainsC: hotel.mainsC,
        ambientC: clim.ambientC,
      },
      dtH,
    );
    const acceptedW = Math.min(chargeReqW, ts.acceptedChargeW);
    const rejectedW = Math.max(0, chargeReqW - acceptedW);
    router.allocW.tank = acceptedW;
    router.allocW.bypass += rejectedW;
    if (router.pumpOn && qAvailableW > 0) {
      for (const s of SINKS) router.valves[s] = router.allocW[s] / qAvailableW;
    }
    tank = ts.state;

    const fromTankW = ts.deliveredDischargeW;
    let solarW = directW + fromTankW;
    let backupW = Math.max(0, draw.demandW - solarW);

    // 6. heat-pump source option (research): collector as source when it cannot harvest and the tank cannot cover
    let heatPump: DayStep['heatPump'];
    if (hpOn) {
      let hp = { on: false, cop: 0, sourceW: 0, workWe: 0 };
      if (!router.pumpOn && backupW > EPS_W) {
        const simHp = simulate(modIn(HP_SOURCE_FLUID_C, 'on'), 'pvt-liquid');
        const qSrc = Math.max(0, simHp.qLiquidW) * modules;
        const cop = heatPumpCop(HP_SOURCE_FLUID_C, hotel.dhwSetpointC, sys.heatPumpSource.carnotFraction);
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
              electricalW: simHp.electricalW * modules,
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

    // 7. desiccant adapter
    const dz = desiccantStep({
      sys,
      capacity,
      allocatedW: router.allocW.desiccant,
      regenC: outletC,
      climate: clim,
      dtH,
    });
    capacity = dz.capacity;

    col.etaThermal = G > 0 && aperture > 0 ? col.qLiquidW / (G * aperture) : 0;
    col.etaElectrical = G > 0 && aperture > 0 ? col.electricalW / (G * aperture) : 0;

    // accumulate [Wh]
    const k = dtH;
    acc.pvWh += col.electricalW * k;
    acc.parasiticWh += (col.pumpW + dz.parasiticWe) * k;
    if (router.pumpOn) acc.collectedWh += qAvailableW * k;
    acc.demandWh += draw.demandW * k;
    acc.solarWh += solarW * k;
    acc.backupWh += backupW * k;
    acc.regenWh += router.allocW.desiccant * k;
    acc.bypassWh += router.allocW.bypass * k;
    acc.lossWh += ts.lossW * k;
    acc.acceptedWh += acceptedW * k;
    acc.deliveredWh += fromTankW * k;
    acc.moistureKg += dz.moistureRemovedKgH * k;
    acc.hvacSavedWh += (dz.refWe - dz.withDesiccantWe) * k;
    if (heatPump) acc.hpWorkWh += heatPump.workWe * k;

    if (record) {
      const step: DayStep = {
        t: tMid,
        hourOfDay,
        climate: clim,
        router,
        collector: col,
        tank,
        dhw: {
          drawLph: draw.drawLph,
          demandW: draw.demandW,
          fromCollectorW: directW,
          fromTankW,
          backupW,
          unmetW: 0,
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
    prev = router;
  }

  return {
    steps,
    acc,
    carry: { tank, router: prev, capacity },
    tank0KWh,
    tank1KWh: tankEnergyKWhTh(tank, tankP, hotel.mainsC),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────────────────────
export interface SimulateSystemOpts {
  strategy?: RouterStrategy;
  /** Step length [h]; default 0,25. */
  dtH?: number;
  /** Run a preceding warm-up day (default true; see assumptions/day.ts). */
  warmUp?: boolean;
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

const startCarry = (sys: SystemInputs): Carry => ({
  tank: initialTank(sys.tank, sys.hotel.mainsC),
  router: undefined,
  capacity: INITIAL_BED_CAPACITY,
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
  if (opts.warmUp ?? true) {
    carry = runPhase(sys, strategy, plan.warm, 24, dtH, carry, false).carry;
  }
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
    const warmed = runPhase(sys, strat, plan.warm, 24, dtH, startCarry(sys), false).carry;
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

/** Annual electricity [kWh_e] of the same array run as plain PV (own cell temperature, no heat extraction). */
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
      wh += r.electricalW * sys.array.modules * dtH;
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
