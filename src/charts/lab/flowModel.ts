/**
 * Day energy ledger for the Lab flow chart (pure TS, no React). Everything is bookkeeping over the recorded
 * DayResult steps: sums of the router allocations, the DHW chain and the tank, plus the radiant input of the array.
 * kWh_th and kWh_e are kept in separate fields and are never added to each other.
 */
import type { DayResult, SystemInputs } from '../../sim/system';

export interface DayFlows {
  /** Length of the scenario [h]. */
  hours: number;
  /** Radiant energy on the array aperture [kWh] (G x A x dt; neither heat nor electricity yet). */
  radiantKWh: number;
  /** PV electricity of the array incl. system derate [kWh_e]. */
  pvKWhE: number;
  /** Circulation pump electricity [kWh_e]. */
  pumpKWhE: number;
  /** Heat delivered into the liquid while the pump runs [kWh_th]. */
  heatKWhTh: number;
  /** Radiant energy that ends as neither PV electricity nor heat in the liquid (optics, front/back loss, derate) [kWh]; a difference. */
  otherKWh: number;
  /** Router destinations of the collected heat [kWh_th]. */
  directKWhTh: number;
  toTankKWhTh: number;
  regenKWhTh: number;
  bypassKWhTh: number;
  /** Tank: heat drawn to DHW, standing loss, stored-heat change (signed) [kWh_th]. */
  tankToDhwKWhTh: number;
  tankLossKWhTh: number;
  tankDeltaKWhTh: number;
  /** Condenser output of the optional heat-pump source mode (counted in solar DHW) [kWh_th]. */
  heatPumpKWhTh: number;
  /** DHW at setpoint: demand, solar-derived part, existing-heater backup [kWh_th]. */
  demandKWhTh: number;
  solarKWhTh: number;
  backupKWhTh: number;
  /** collected - (direct + tank + desiccant + bypass); should be ~0 [kWh_th]. */
  routerResidualKWhTh: number;
}

export function dayFlows(sys: SystemInputs, day: DayResult): DayFlows {
  const k = day.dtH;
  const apertureM2 = sys.array.modules * sys.array.module.areaM2;
  let radiant = 0;
  let pv = 0;
  let pump = 0;
  let direct = 0;
  let toTank = 0;
  let regen = 0;
  let bypass = 0;
  let fromTank = 0;
  let demand = 0;
  let backup = 0;
  for (const s of day.steps) {
    radiant += s.climate.irradiance * apertureM2 * k;
    pv += s.collector.electricalW * k;
    pump += s.collector.pumpW * k;
    direct += s.router.allocW.dhw * k;
    toTank += s.router.allocW.tank * k;
    regen += s.router.allocW.desiccant * k;
    bypass += s.router.allocW.bypass * k;
    fromTank += s.dhw.fromTankW * k;
    demand += s.dhw.demandW * k;
    backup += s.dhw.backupW * k;
  }
  const t = day.totals;
  const heat = Number(t.collectedKWhTh);
  const solar = Math.max(0, (demand - backup) / 1000);
  const toKWh = (wh: number) => wh / 1000;
  const flows: DayFlows = {
    hours: day.steps.length * k,
    radiantKWh: toKWh(radiant),
    pvKWhE: toKWh(pv),
    pumpKWhE: toKWh(pump),
    heatKWhTh: heat,
    otherKWh: Math.max(0, toKWh(radiant) - toKWh(pv) - heat),
    directKWhTh: toKWh(direct),
    toTankKWhTh: toKWh(toTank),
    regenKWhTh: toKWh(regen),
    bypassKWhTh: toKWh(bypass),
    tankToDhwKWhTh: toKWh(fromTank),
    tankLossKWhTh: Number(t.tankLossKWhTh),
    tankDeltaKWhTh: Number(t.tankDeltaKWhTh),
    heatPumpKWhTh: Math.max(0, solar - toKWh(direct) - toKWh(fromTank)),
    demandKWhTh: toKWh(demand),
    solarKWhTh: solar,
    backupKWhTh: toKWh(backup),
    routerResidualKWhTh: 0,
  };
  flows.routerResidualKWhTh = flows.heatKWhTh - (flows.directKWhTh + flows.toTankKWhTh + flows.regenKWhTh + flows.bypassKWhTh);
  return flows;
}
