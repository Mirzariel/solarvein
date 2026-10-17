/**
 * GOLDEN SNAPSHOT of v2 outputs (cutover guard). Values were recorded from DEFAULT_SYSTEM before the v1
 * concept was deleted; any change here means a v2 number moved. Do NOT re-record to make a refactor pass.
 * Tolerance: 1e-6 relative (absolute 1e-9 near zero).
 */
import { describe, expect, it } from 'vitest';
import { simulate } from '../../model';
import { compareBaselines } from '../carbon';
import { baselineInputs, simulateSystem, simulateYear } from '../day';
import { desiccantSweep } from '../desiccant';
import { DEFAULT_SYSTEM } from '../hotel';
import { MODE_TARGETS, desiccantInputFor } from '../views';

function close(actual: number, expected: number, label: string) {
  const tol = Math.max(1e-9, Math.abs(expected) * 1e-6);
  expect(Math.abs(actual - expected), `${label}: ${actual} vs ${expected}`).toBeLessThanOrEqual(tol);
}
function matches(table: Record<string, number>, actual: Record<string, number>) {
  expect(Object.keys(actual).sort()).toEqual(Object.keys(table).sort());
  for (const [k, v] of Object.entries(table)) close(actual[k] as number, v, k);
}
const numeric = (o: object, prefix: string, out: Record<string, number>) => {
  for (const [k, v] of Object.entries(o)) if (typeof v === 'number') out[`${prefix}.${k}`] = v;
};

const DAY: Record<string, number> = {
  'day.terik.adaptive.pvKWhE': 79.52734423240351,
  'day.terik.adaptive.parasiticKWhE': 1.1680555555555563,
  'day.terik.adaptive.collectedKWhTh': 127.4115417155049,
  'day.terik.adaptive.dhwDemandKWhTh': 206.28608000000003,
  'day.terik.adaptive.dhwSolarKWhTh': 108.3469410279096,
  'day.terik.adaptive.dhwBackupKWhTh': 97.93913897209043,
  'day.terik.adaptive.unmetKWhTh': 0.0,
  'day.terik.adaptive.desiccantRegenKWhTh': 0.0,
  'day.terik.adaptive.bypassKWhTh': 15.477896063844115,
  'day.terik.adaptive.tankLossKWhTh': 3.573679918152327,
  'day.terik.adaptive.tankDeltaKWhTh': 0.013024705599661957,
  'day.terik.adaptive.solarFraction': 0.525226622309705,
  'day.terik.adaptive.moistureRemovedKg': 0.0,
  'day.terik.adaptive.hvacSavedKWhE': 0.0,
  'day.terik.dhw-priority.pvKWhE': 79.52734423240351,
  'day.terik.dhw-priority.parasiticKWhE': 1.1680555555555563,
  'day.terik.dhw-priority.collectedKWhTh': 127.4115417155049,
  'day.terik.dhw-priority.dhwDemandKWhTh': 206.28608000000003,
  'day.terik.dhw-priority.dhwSolarKWhTh': 108.3469410279096,
  'day.terik.dhw-priority.dhwBackupKWhTh': 97.93913897209043,
  'day.terik.dhw-priority.unmetKWhTh': 0.0,
  'day.terik.dhw-priority.desiccantRegenKWhTh': 0.0,
  'day.terik.dhw-priority.bypassKWhTh': 15.477896063844115,
  'day.terik.dhw-priority.tankLossKWhTh': 3.573679918152327,
  'day.terik.dhw-priority.tankDeltaKWhTh': 0.013024705599661957,
  'day.terik.dhw-priority.solarFraction': 0.525226622309705,
  'day.terik.dhw-priority.moistureRemovedKg': 0.0,
  'day.terik.dhw-priority.hvacSavedKWhE': 0.0,
  'day.berawan.adaptive.pvKWhE': 52.63286963805095,
  'day.berawan.adaptive.parasiticKWhE': 0.8458333333333337,
  'day.berawan.adaptive.collectedKWhTh': 65.82184174002639,
  'day.berawan.adaptive.dhwDemandKWhTh': 206.28608000000003,
  'day.berawan.adaptive.dhwSolarKWhTh': 60.29604120998416,
  'day.berawan.adaptive.dhwBackupKWhTh': 145.99003879001577,
  'day.berawan.adaptive.unmetKWhTh': 0.0,
  'day.berawan.adaptive.desiccantRegenKWhTh': 0.0,
  'day.berawan.adaptive.bypassKWhTh': 3.3773445859656377,
  'day.berawan.adaptive.tankLossKWhTh': 2.1495748738089,
  'day.berawan.adaptive.tankDeltaKWhTh': -0.0011189297322928837,
  'day.berawan.adaptive.solarFraction': 0.29229331038712913,
  'day.berawan.adaptive.moistureRemovedKg': 0.0,
  'day.berawan.adaptive.hvacSavedKWhE': 0.0,
  'day.berawan.dhw-priority.pvKWhE': 52.63286963805095,
  'day.berawan.dhw-priority.parasiticKWhE': 0.8458333333333337,
  'day.berawan.dhw-priority.collectedKWhTh': 65.82184174002639,
  'day.berawan.dhw-priority.dhwDemandKWhTh': 206.28608000000003,
  'day.berawan.dhw-priority.dhwSolarKWhTh': 60.29604120998416,
  'day.berawan.dhw-priority.dhwBackupKWhTh': 145.99003879001577,
  'day.berawan.dhw-priority.unmetKWhTh': 0.0,
  'day.berawan.dhw-priority.desiccantRegenKWhTh': 0.0,
  'day.berawan.dhw-priority.bypassKWhTh': 3.3773445859656377,
  'day.berawan.dhw-priority.tankLossKWhTh': 2.1495748738089,
  'day.berawan.dhw-priority.tankDeltaKWhTh': -0.0011189297322928837,
  'day.berawan.dhw-priority.solarFraction': 0.29229331038712913,
  'day.berawan.dhw-priority.moistureRemovedKg': 0.0,
  'day.berawan.dhw-priority.hvacSavedKWhE': 0.0,
  'day.hujan.adaptive.pvKWhE': 28.16017925517409,
  'day.hujan.adaptive.parasiticKWhE': 0.2416666666666667,
  'day.hujan.adaptive.collectedKWhTh': 11.966357599476481,
  'day.hujan.adaptive.dhwDemandKWhTh': 206.28608000000003,
  'day.hujan.adaptive.dhwSolarKWhTh': 10.67552890027921,
  'day.hujan.adaptive.dhwBackupKWhTh': 195.6105510997208,
  'day.hujan.adaptive.unmetKWhTh': 0.0,
  'day.hujan.adaptive.desiccantRegenKWhTh': 0.0,
  'day.hujan.adaptive.bypassKWhTh': 9.094947017729283e-16,
  'day.hujan.adaptive.tankLossKWhTh': 1.2921739874981328,
  'day.hujan.adaptive.tankDeltaKWhTh': -0.001345288300946379,
  'day.hujan.adaptive.solarFraction': 0.05175108713239016,
  'day.hujan.adaptive.moistureRemovedKg': 0.0,
  'day.hujan.adaptive.hvacSavedKWhE': 0.0,
  'day.hujan.dhw-priority.pvKWhE': 28.16017925517409,
  'day.hujan.dhw-priority.parasiticKWhE': 0.2416666666666667,
  'day.hujan.dhw-priority.collectedKWhTh': 11.966357599476481,
  'day.hujan.dhw-priority.dhwDemandKWhTh': 206.28608000000003,
  'day.hujan.dhw-priority.dhwSolarKWhTh': 10.67552890027921,
  'day.hujan.dhw-priority.dhwBackupKWhTh': 195.6105510997208,
  'day.hujan.dhw-priority.unmetKWhTh': 0.0,
  'day.hujan.dhw-priority.desiccantRegenKWhTh': 0.0,
  'day.hujan.dhw-priority.bypassKWhTh': 9.094947017729283e-16,
  'day.hujan.dhw-priority.tankLossKWhTh': 1.2921739874981328,
  'day.hujan.dhw-priority.tankDeltaKWhTh': -0.001345288300946379,
  'day.hujan.dhw-priority.solarFraction': 0.05175108713239016,
  'day.hujan.dhw-priority.moistureRemovedKg': 0.0,
  'day.hujan.dhw-priority.hvacSavedKWhE': 0.0,
  'day.hujan-3-hari.adaptive.pvKWhE': 80.53928652584959,
  'day.hujan-3-hari.adaptive.parasiticKWhE': 0.32222222222222224,
  'day.hujan-3-hari.adaptive.collectedKWhTh': 20.994209455622375,
  'day.hujan-3-hari.adaptive.dhwDemandKWhTh': 618.8582400000001,
  'day.hujan-3-hari.adaptive.dhwSolarKWhTh': 45.85296357158526,
  'day.hujan-3-hari.adaptive.dhwBackupKWhTh': 573.0052764284147,
  'day.hujan-3-hari.adaptive.unmetKWhTh': 0.0,
  'day.hujan-3-hari.adaptive.desiccantRegenKWhTh': 0.0,
  'day.hujan-3-hari.adaptive.bypassKWhTh': 1.5201739646737105,
  'day.hujan-3-hari.adaptive.tankLossKWhTh': 4.483326655728722,
  'day.hujan-3-hari.adaptive.tankDeltaKWhTh': -30.86225473636465,
  'day.hujan-3-hari.adaptive.solarFraction': 0.07409283840445471,
  'day.hujan-3-hari.adaptive.moistureRemovedKg': 0.0,
  'day.hujan-3-hari.adaptive.hvacSavedKWhE': 0.0,
  'day.hujan-3-hari.dhw-priority.pvKWhE': 80.53928652584959,
  'day.hujan-3-hari.dhw-priority.parasiticKWhE': 0.32222222222222224,
  'day.hujan-3-hari.dhw-priority.collectedKWhTh': 20.994209455622375,
  'day.hujan-3-hari.dhw-priority.dhwDemandKWhTh': 618.8582400000001,
  'day.hujan-3-hari.dhw-priority.dhwSolarKWhTh': 45.85296357158526,
  'day.hujan-3-hari.dhw-priority.dhwBackupKWhTh': 573.0052764284147,
  'day.hujan-3-hari.dhw-priority.unmetKWhTh': 0.0,
  'day.hujan-3-hari.dhw-priority.desiccantRegenKWhTh': 0.0,
  'day.hujan-3-hari.dhw-priority.bypassKWhTh': 1.5201739646737105,
  'day.hujan-3-hari.dhw-priority.tankLossKWhTh': 4.483326655728722,
  'day.hujan-3-hari.dhw-priority.tankDeltaKWhTh': -30.86225473636465,
  'day.hujan-3-hari.dhw-priority.solarFraction': 0.07409283840445471,
  'day.hujan-3-hari.dhw-priority.moistureRemovedKg': 0.0,
  'day.hujan-3-hari.dhw-priority.hvacSavedKWhE': 0.0,
  'day.terik.fixed-schedule.pvKWhE': 81.10893597384901,
  'day.terik.fixed-schedule.parasiticKWhE': 1.248611111111112,
  'day.terik.fixed-schedule.collectedKWhTh': 180.83174873656134,
  'day.terik.fixed-schedule.dhwDemandKWhTh': 206.28608000000003,
  'day.terik.fixed-schedule.dhwSolarKWhTh': 62.74413949187804,
  'day.terik.fixed-schedule.dhwBackupKWhTh': 143.54194050812197,
  'day.terik.fixed-schedule.unmetKWhTh': 0.0,
  'day.terik.fixed-schedule.desiccantRegenKWhTh': 115.10841011462718,
  'day.terik.fixed-schedule.bypassKWhTh': 1.009430437221624,
  'day.terik.fixed-schedule.tankLossKWhTh': 1.9696598800209268,
  'day.terik.fixed-schedule.tankDeltaKWhTh': 0.00010881281412622457,
  'day.terik.fixed-schedule.solarFraction': 0.30416080179466315,
  'day.terik.fixed-schedule.moistureRemovedKg': 5.086041359054447,
  'day.terik.fixed-schedule.hvacSavedKWhE': -0.37655883520265027,
  'day.berawan.fixed-schedule.pvKWhE': 53.37090326277546,
  'day.berawan.fixed-schedule.parasiticKWhE': 1.047222222222223,
  'day.berawan.fixed-schedule.collectedKWhTh': 105.6390597070576,
  'day.berawan.fixed-schedule.dhwDemandKWhTh': 206.28608000000003,
  'day.berawan.fixed-schedule.dhwSolarKWhTh': 30.84535158251635,
  'day.berawan.fixed-schedule.dhwBackupKWhTh': 175.44072841748365,
  'day.berawan.fixed-schedule.unmetKWhTh': 0.0,
  'day.berawan.fixed-schedule.desiccantRegenKWhTh': 72.22018926819277,
  'day.berawan.fixed-schedule.bypassKWhTh': 1.4081930998042564,
  'day.berawan.fixed-schedule.tankLossKWhTh': 1.1633084280714374,
  'day.berawan.fixed-schedule.tankDeltaKWhTh': 0.002017328472749824,
  'day.berawan.fixed-schedule.solarFraction': 0.14952706252654735,
  'day.berawan.fixed-schedule.moistureRemovedKg': 0.0,
  'day.berawan.fixed-schedule.hvacSavedKWhE': 0.0,
  'day.hujan.fixed-schedule.pvKWhE': 28.16511237067081,
  'day.hujan.fixed-schedule.parasiticKWhE': 0.2416666666666667,
  'day.hujan.fixed-schedule.collectedKWhTh': 12.398420818928129,
  'day.hujan.fixed-schedule.dhwDemandKWhTh': 206.28608000000003,
  'day.hujan.fixed-schedule.dhwSolarKWhTh': 2.5750269588654726,
  'day.hujan.fixed-schedule.dhwBackupKWhTh': 203.71105304113456,
  'day.hujan.fixed-schedule.unmetKWhTh': 0.0,
  'day.hujan.fixed-schedule.desiccantRegenKWhTh': 8.58820537234075,
  'day.hujan.fixed-schedule.bypassKWhTh': 0.0,
  'day.hujan.fixed-schedule.tankLossKWhTh': 1.2338811993791785,
  'day.hujan.fixed-schedule.tankDeltaKWhTh': 0.0013072883422751147,
  'day.hujan.fixed-schedule.solarFraction': 0.012482795537466573,
  'day.hujan.fixed-schedule.moistureRemovedKg': 0.0,
  'day.hujan.fixed-schedule.hvacSavedKWhE': 0.0,
  'day.hujan-3-hari.fixed-schedule.pvKWhE': 80.64488838812865,
  'day.hujan-3-hari.fixed-schedule.parasiticKWhE': 0.44305555555555554,
  'day.hujan-3-hari.fixed-schedule.collectedKWhTh': 29.657299124488652,
  'day.hujan-3-hari.fixed-schedule.dhwDemandKWhTh': 618.8582400000001,
  'day.hujan-3-hari.fixed-schedule.dhwSolarKWhTh': 3.8821249048519753,
  'day.hujan-3-hari.fixed-schedule.dhwBackupKWhTh': 614.976115095148,
  'day.hujan-3-hari.fixed-schedule.unmetKWhTh': 0.0,
  'day.hujan-3-hari.fixed-schedule.desiccantRegenKWhTh': 27.880447086324335,
  'day.hujan-3-hari.fixed-schedule.bypassKWhTh': 0.0,
  'day.hujan-3-hari.fixed-schedule.tankLossKWhTh': 3.8243534387671327,
  'day.hujan-3-hari.fixed-schedule.tankDeltaKWhTh': -5.929626305454914,
  'day.hujan-3-hari.fixed-schedule.solarFraction': 0.006273043895887973,
  'day.hujan-3-hari.fixed-schedule.moistureRemovedKg': 0.0,
  'day.hujan-3-hari.fixed-schedule.hvacSavedKWhE': 0.0,
};

const YEAR: Record<string, number> = {
  'year.adaptive.pvKWhE': 25701.998083705348,
  'year.adaptive.parasiticKWhE': 381.83333333333354,
  'year.adaptive.collectedKWhTh': 38922.5134667484,
  'year.adaptive.dhwDemandKWhTh': 75294.41920000002,
  'year.adaptive.dhwSolarKWhTh': 33516.72681056963,
  'year.adaptive.dhwBackupKWhTh': 41777.69238943037,
  'year.adaptive.unmetKWhTh': 0.0,
  'year.adaptive.desiccantRegenKWhTh': 0.0,
  'year.adaptive.bypassKWhTh': 4267.711231946985,
  'year.adaptive.tankLossKWhTh': 1134.880601953161,
  'year.adaptive.tankDeltaKWhTh': 3.1948222788317793,
  'year.adaptive.solarFraction': 0.4451422451581859,
  'year.adaptive.moistureRemovedKg': 0.0,
  'year.adaptive.hvacSavedKWhE': 0.0,
  'year.dhw-priority.pvKWhE': 25701.998083705348,
  'year.dhw-priority.parasiticKWhE': 381.83333333333354,
  'year.dhw-priority.collectedKWhTh': 38922.5134667484,
  'year.dhw-priority.dhwDemandKWhTh': 75294.41920000002,
  'year.dhw-priority.dhwSolarKWhTh': 33516.72681056963,
  'year.dhw-priority.dhwBackupKWhTh': 41777.69238943037,
  'year.dhw-priority.unmetKWhTh': 0.0,
  'year.dhw-priority.desiccantRegenKWhTh': 0.0,
  'year.dhw-priority.bypassKWhTh': 4267.711231946985,
  'year.dhw-priority.tankLossKWhTh': 1134.880601953161,
  'year.dhw-priority.tankDeltaKWhTh': 3.1948222788317793,
  'year.dhw-priority.solarFraction': 0.4451422451581859,
  'year.dhw-priority.moistureRemovedKg': 0.0,
  'year.dhw-priority.hvacSavedKWhE': 0.0,
  'year.fixed-schedule.pvKWhE': 26175.491168855227,
  'year.fixed-schedule.parasiticKWhE': 421.50694444444474,
  'year.fixed-schedule.collectedKWhTh': 56333.78291227753,
  'year.fixed-schedule.dhwDemandKWhTh': 75294.41920000002,
  'year.fixed-schedule.dhwSolarKWhTh': 18968.689375150934,
  'year.fixed-schedule.dhwBackupKWhTh': 56325.72982484907,
  'year.fixed-schedule.unmetKWhTh': 0.0,
  'year.fixed-schedule.desiccantRegenKWhTh': 36342.38564029336,
  'year.fixed-schedule.bypassKWhTh': 391.1831059729185,
  'year.fixed-schedule.tankLossKWhTh': 631.2857880628105,
  'year.fixed-schedule.tankDeltaKWhTh': 0.23900279764754728,
  'year.fixed-schedule.solarFraction': 0.2519268967965016,
  'year.fixed-schedule.moistureRemovedKg': 1296.940546558884,
  'year.fixed-schedule.hvacSavedKWhE': -96.02250297667582,
};

const LEDGER: Record<string, number> = {
  'ledger.B1.net': 29604.48096341108,
  'ledger.B2.net': 6632.966421174773,
  'ledger.B3.net': -15.0,
  'ledger.B4.net': 1657.4649529903022,
};

const DESI: Record<string, number> = {
  'desi.ambient.35.moist': 0.0,
  'desi.ambient.35.net': 0.0,
  'desi.ambient.40.moist': 0.0,
  'desi.ambient.40.net': 0.0,
  'desi.ambient.45.moist': 11.42033800792958,
  'desi.ambient.45.net': -84.34438315146326,
  'desi.ambient.50.moist': 15.023440128300212,
  'desi.ambient.50.net': 119.07617256745289,
  'desi.ambient.55.moist': 18.02915346690648,
  'desi.ambient.55.net': 270.74350619839606,
  'desi.ambient.60.moist': 20.512801349460865,
  'desi.ambient.60.net': 371.4808291713598,
  'desi.ambient.65.moist': 22.54736494384511,
  'desi.ambient.65.net': 423.85981995751354,
  'desi.ambient.70.moist': 24.20266376355288,
  'desi.ambient.70.net': 432.02242570283306,
  'desi.exhaust.35.moist': 10.004208418245526,
  'desi.exhaust.35.net': 280.0424858634069,
  'desi.exhaust.40.moist': 15.436233648143894,
  'desi.exhaust.40.net': 691.0595660997642,
  'desi.exhaust.45.moist': 18.4936902972195,
  'desi.exhaust.45.net': 838.6278929723976,
  'desi.exhaust.50.moist': 21.020624153424414,
  'desi.exhaust.50.net': 938.7974091441865,
  'desi.exhaust.55.moist': 23.07659614348232,
  'desi.exhaust.55.net': 990.0365606152518,
  'desi.exhaust.60.moist': 24.73177207051792,
  'desi.exhaust.60.net': 995.2866181530571,
  'desi.exhaust.65.moist': 26.216340858643633,
  'desi.exhaust.65.net': 985.3191084429473,
  'desi.exhaust.70.moist': 27.481923982059385,
  'desi.exhaust.70.net': 950.3340485933968,
};

const MOD: Record<string, number> = {
  'mod.0.cellC': 45.902183817082225,
  'mod.0.stagnationC': 74.56452213941867,
  'mod.0.outletC': 44.96917812539762,
  'mod.0.qLiquidW': 686.9211814661568,
  'mod.0.electricalW': 283.613761131905,
  'mod.0.massFlowKgS': 0.03307090362431342,
  'mod.1.cellC': 53.52799629437691,
  'mod.1.stagnationC': 46.2976202447809,
  'mod.1.outletC': 53.7579348638035,
  'mod.1.qLiquidW': -170.59793789274968,
  'mod.1.electricalW': 122.42067376387661,
  'mod.1.massFlowKgS': 0.032858907808226555,
  'mod.2.cellC': 16.045019079276468,
  'mod.2.stagnationC': 21.71727719745941,
  'mod.2.outletC': 15.877729722035026,
  'mod.2.qLiquidW': 122.16871480743104,
  'mod.2.electricalW': 0.0,
  'mod.2.massFlowKgS': 0.03329836569413717,
  'mod.cpv.cellC': 53.96138061762215,
  'mod.cpv.electricalW': 274.9823613585267,
  'mod.auto.cellC': 39.69767210318093,
  'mod.auto.outletC': 38.952633607783966,
  'mod.auto.qLiquidW': 547.3710062682158,
  'mod.auto.electricalW': 225.75683913805028,
};

const STRATEGIES = ['adaptive', 'dhw-priority', 'fixed-schedule'] as const;
const SCENARIOS = ['terik', 'berawan', 'hujan', 'hujan-3-hari'] as const;

describe('golden: v2 system outputs', () => {
  it('simulateSystem totals, 4 scenarios x 3 strategies', () => {
    const out: Record<string, number> = {};
    for (const sc of SCENARIOS)
      for (const st of STRATEGIES) numeric(simulateSystem(DEFAULT_SYSTEM, sc, { strategy: st }).totals, `day.${sc}.${st}`, out);
    matches(DAY, out);
  });

  it('simulateYear totals, 3 strategies', () => {
    const out: Record<string, number> = {};
    for (const st of STRATEGIES) numeric(simulateYear(DEFAULT_SYSTEM, st).totals, `year.${st}`, out);
    matches(YEAR, out);
  });

  it('carbon ledgers B1..B4 net kg/yr', () => {
    const cmp = compareBaselines(DEFAULT_SYSTEM, baselineInputs(DEFAULT_SYSTEM));
    const out: Record<string, number> = {};
    for (const b of ['B1', 'B2', 'B3', 'B4'] as const) out[`ledger.${b}.net`] = cmp.ledgers[b].netKgPerYear;
    matches(LEDGER, out);
  });

  it('desiccant sweep 35..70 C, ambient and exhaust regeneration air', () => {
    const temps = [35, 40, 45, 50, 55, 60, 65, 70];
    const out: Record<string, number> = {};
    for (const ra of ['ambient', 'exhaust'] as const) {
      const sw = desiccantSweep(desiccantInputFor(DEFAULT_SYSTEM, MODE_TARGETS.A.scenario, MODE_TARGETS.A.hour, ra), temps);
      sw.forEach((e, i) => {
        out[`desi.${ra}.${temps[i]}.moist`] = e.moistureRemovedKgH;
        out[`desi.${ra}.${temps[i]}.net`] = e.hvac.netSavingWe;
      });
    }
    matches(DESI, out);
  });

  it('collector simulate(): pvt-liquid at 3 states + auto, conventional-pv', () => {
    const m = DEFAULT_SYSTEM.array.module;
    const states = [
      { irradiance: 900, ambientC: 32, inletC: 40 },
      { irradiance: 400, ambientC: 28, inletC: 55 },
      { irradiance: 0, ambientC: 24, inletC: 15 },
    ];
    const out: Record<string, number> = {};
    states.forEach((s, i) => {
      const r = simulate({ ...m, ...s, pumpControl: 'on' }, 'pvt-liquid');
      for (const k of ['cellC', 'stagnationC', 'outletC', 'qLiquidW', 'electricalW', 'massFlowKgS'] as const) out[`mod.${i}.${k}`] = r[k];
    });
    const c = simulate({ ...m, irradiance: 900, ambientC: 32, windMs: 2, pumpControl: 'off' }, 'conventional-pv');
    for (const k of ['cellC', 'electricalW'] as const) out[`mod.cpv.${k}`] = c[k];
    const a = simulate({ ...m, irradiance: 700, ambientC: 30, inletC: 35, pumpControl: 'auto' }, 'pvt-liquid');
    for (const k of ['cellC', 'outletC', 'qLiquidW', 'electricalW'] as const) out[`mod.auto.${k}`] = a[k];
    matches(MOD, out);
  });
});
