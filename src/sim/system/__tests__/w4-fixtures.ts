import { DEFAULT_CARBON_PARAMS } from '../assumptions/carbon';
import { DEFAULT_ECONOMIC_PARAMS } from '../assumptions/economics';
import type { AnnualResult, BaselineInputs, DayTotals, DesiccantEval, HotelParams, SystemInputs } from '../contract';
import { kWhE, kWhTh } from '../contract';

function hotel(over: Partial<HotelParams> = {}): HotelParams {
  return {
    label: 'Hotel uji',
    rooms: 100,
    occupancy: 0.7,
    dhwLitresPerOccupiedRoomDay: 150,
    dhwSetpointC: 60,
    mainsC: 27,
    heater: 'lpg',
    heaterEfficiency: 0.85,
    freshAirKgS: 1,
    supplyDewPointC: 11,
    ...over,
  };
}

export function sysFixture(over: { hotel?: Partial<HotelParams>; desiccantOn?: boolean; hp?: boolean } = {}): SystemInputs {
  return {
    hotel: hotel(over.hotel),
    array: { modules: 50, systemDerate: 0.84, module: {} as never },
    tank: { volumeL: 5000, uaWPerK: 5, maxC: 80, initialTopC: 40, initialBottomC: 30 },
    desiccant: { enabled: over.desiccantOn ?? false } as never,
    controller: { strategy: 'adaptive', onK: 8, offK: 3, desiccantMinRegenC: 55 },
    carbon: { ...DEFAULT_CARBON_PARAMS, gridKgPerKWhE: 0.8 }, // formula tests pin EF = 0,8 (defaults may change)
    economics: { ...DEFAULT_ECONOMIC_PARAMS },
    heatPumpSource: { enabled: over.hp ?? false, carnotFraction: 0.45 },
  };
}

function totals(o: Partial<Record<keyof DayTotals, number>>): DayTotals {
  const z = (k: keyof DayTotals) => o[k] ?? 0;
  return {
    pvKWhE: kWhE(z('pvKWhE')),
    parasiticKWhE: kWhE(z('parasiticKWhE')),
    collectedKWhTh: kWhTh(z('collectedKWhTh')),
    dhwDemandKWhTh: kWhTh(z('dhwDemandKWhTh')),
    dhwSolarKWhTh: kWhTh(z('dhwSolarKWhTh')),
    dhwBackupKWhTh: kWhTh(z('dhwBackupKWhTh')),
    unmetKWhTh: kWhTh(0),
    desiccantRegenKWhTh: kWhTh(z('desiccantRegenKWhTh')),
    bypassKWhTh: kWhTh(z('bypassKWhTh')),
    tankLossKWhTh: kWhTh(z('tankLossKWhTh')),
    tankDeltaKWhTh: kWhTh(0),
    solarFraction: z('dhwDemandKWhTh') > 0 ? z('dhwSolarKWhTh') / z('dhwDemandKWhTh') : 0,
    moistureRemovedKg: 0,
    hvacSavedKWhE: kWhE(z('hvacSavedKWhE')),
    ...(o.heatPumpWorkKWhE !== undefined ? { heatPumpWorkKWhE: kWhE(o.heatPumpWorkKWhE) } : {}),
  };
}

export function annual(o: Partial<Record<keyof DayTotals, number>>): AnnualResult {
  return { weights: [{ scenario: 'terik', days: 365 }], strategy: 'adaptive', totals: totals(o) };
}

export const D = 80_000;
export function inputsFixture(over: Partial<{ svPv: number; svBackup: number; svPar: number; hvac: number; area: number; convPv: number; hpWork: number }> = {}): BaselineInputs {
  const area = over.area ?? 100;
  return {
    solarvein: annual({
      pvKWhE: over.svPv ?? 20_000,
      parasiticKWhE: over.svPar ?? 1_500,
      dhwDemandKWhTh: D,
      dhwSolarKWhTh: D - (over.svBackup ?? 40_000),
      dhwBackupKWhTh: over.svBackup ?? 40_000,
      tankLossKWhTh: 3_000,
      hvacSavedKWhE: over.hvac ?? 0,
      ...(over.hpWork !== undefined ? { heatPumpWorkKWhE: over.hpWork } : {}),
    }),
    pvtDhwOnly: annual({
      pvKWhE: 20_000,
      parasiticKWhE: 1_200,
      dhwDemandKWhTh: D,
      dhwSolarKWhTh: D - 45_000,
      dhwBackupKWhTh: 45_000,
    }),
    conventionalPvKWhEPerYear: kWhE(over.convPv ?? 18_000),
    dhwDemandKWhThPerYear: kWhTh(D),
    areaM2: area,
  };
}

export const desiccantEval = (netSavingWe: number, regenHeatW: number): DesiccantEval =>
  ({
    regenHeatW,
    hvac: { coilRefWe: 0, aftercoolerWe: 0, fanWe: 0, pumpWe: 0, pvPenaltyWe: 0, netSavingWe },
  }) as unknown as DesiccantEval;

