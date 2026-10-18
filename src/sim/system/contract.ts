/**
 * SolarVein v2 — SYSTEM contract (lead-owned). Adaptive PV/T for low-carbon hospitality.
 *
 * The collector itself is still `simulate()` in ../model.ts (SimInputs → SimResult, harvest physics).
 * Everything here is the hotel-scale system around it: climate, hotel demand, buffer tank, router,
 * DHW preheat, desiccant research path, heat-pump source option, carbon ledger vs baselines, economics.
 *
 * RULES (binding for every v2 module)
 *  - Pure TypeScript. No React/DOM/three imports under src/sim/**.
 *  - Units: temperature °C, power W (W_th or W_e, stated per field), energy kWh (branded types below),
 *    time h, humidity ratio kg_water/kg_dry_air, mass kg, money IDR.
 *  - Thermal and electrical energy are NEVER added without an explicit, displayed factor
 *    (heater efficiency, COP, emission factor). Use the branded types to make mixing a compile error.
 *  - η_th is never a constant: thermal output always comes from `simulate()` at the actual inlet
 *    (tank/return) temperature and irradiance.
 *  - Controller modes are STATES computed from conditions (irradiance, collector vs tank temperature,
 *    demand) — never from the clock.
 *  - Hotel service never depends on the sun: the existing heater and AC are always the backup. Unmet
 *    demand must be 0 in every scenario; only the savings change.
 *  - Every user-facing number must carry an EvidenceTag (and a refId when it rests on a source).
 *  - Indonesian user-facing strings (EYD V), decimal comma is applied by the UI formatter, not here.
 *  - Fields may be ADDED (prefer optional). Never rename/remove without the lead.
 */
import type { SimInputs } from '../types';
import type { RefId } from '../references';

// ─────────────────────────────────────────────────────────────────────────────
// Branded energy units
// ─────────────────────────────────────────────────────────────────────────────
declare const unit: unique symbol;
/** Thermal energy [kWh_th]. */
export type KWhTh = number & { readonly [unit]: 'kWh_th' };
/** Electrical energy [kWh_e]. */
export type KWhE = number & { readonly [unit]: 'kWh_e' };
/** Fuel (chemical, NCV) energy [kWh_fuel]. */
export type KWhFuel = number & { readonly [unit]: 'kWh_fuel' };
export const kWhTh = (x: number): KWhTh => x as KWhTh;
export const kWhE = (x: number): KWhE => x as KWhE;
export const kWhFuel = (x: number): KWhFuel => x as KWhFuel;

// ─────────────────────────────────────────────────────────────────────────────
// Evidence taxonomy
// ─────────────────────────────────────────────────────────────────────────────
/**
 * mapan = established principle · terbit = published finding (needs refId) · simulasi = computed by
 * this model · asumsi = engineering assumption · hipotesis = research hypothesis (not validated) ·
 * usulan = proposed innovation.
 */
export type EvidenceTag = 'mapan' | 'terbit' | 'simulasi' | 'asumsi' | 'hipotesis' | 'usulan';
/** Id into REFERENCES (src/sim/references.ts). Unknown ids are a compile error. */
export type RefIdLike = RefId;

/** One documented assumption (Lab "Rincian rekayasa", Validasi). */
export interface AssumptionEntry {
  id: string;
  /** Indonesian title. */
  title: string;
  /** Indonesian one-to-three sentence body. */
  body: string;
  /** Display value incl. unit, e.g. "0,8 kgCO₂e/kWh_e (rentang 0,7–0,9)". */
  value?: string;
  tag: EvidenceTag;
  refId?: RefIdLike;
}

// ─────────────────────────────────────────────────────────────────────────────
// Climate, hotel, equipment parameters
// ─────────────────────────────────────────────────────────────────────────────
/** Day types used for 24 h views and annual weighting; 'hujan-3-hari' is a 72 h scenario. */
export type DayScenarioId = 'terik' | 'berawan' | 'hujan' | 'hujan-3-hari';

/** Weather at one instant. */
export interface ClimatePoint {
  /** Plane-of-array irradiance [W/m²]. Rainy days are NOT zero (diffuse light). */
  irradiance: number;
  ambientC: number;
  /** Relative humidity [0..1]. */
  rh: number;
  /** Humidity ratio [kg/kg dry air]; consistent with ambientC and rh. */
  humidityRatio: number;
  windMs: number;
  rainMmH: number;
}

export type HeaterType = 'lpg' | 'electric-resistance' | 'heat-pump';

export interface HotelParams {
  /** Display name of the preset, Indonesian. */
  label: string;
  rooms: number;
  /** Occupancy fraction [0..1]. */
  occupancy: number;
  /** Hot water use at setpoint per occupied room per day [L]. */
  dhwLitresPerOccupiedRoomDay: number;
  /** Delivered hot-water setpoint [°C] (≥ 60 °C at the existing heater for Legionella control). */
  dhwSetpointC: number;
  /** Cold mains temperature [°C]. */
  mainsC: number;
  /** Existing (backup) water heater. */
  heater: HeaterType;
  /** Heater efficiency [-] (LPG/electric) or COP (heat pump). */
  heaterEfficiency: number;
  /** Fresh/ventilation air through the AHU that the desiccant could treat [kg/s dry air]. */
  freshAirKgS: number;
  /** Supply-air dew point the AC must reach for humidity control [°C]. */
  supplyDewPointC: number;
}

export interface ArrayParams {
  /** Number of PV/T modules; array area = modules × module.areaM2. */
  modules: number;
  /** Per-module collector parameters (weather/inlet fields are overwritten per time step). */
  module: SimInputs;
  /**
   * PV system derate applied to DC module output of PV/T AND plain-PV baselines (inverter, wiring, soiling,
   * mismatch, IAM) [-], e.g. 0,84. Specific yield must land in a plausible band for the site.
   */
  systemDerate: number;
}

export interface TankParams {
  volumeL: number;
  /** Overall loss coefficient UA [W/K]. */
  uaWPerK: number;
  /** Maximum allowed buffer temperature [°C] (above → bypass). */
  maxC: number;
  /** Initial node temperatures [°C]. */
  initialTopC: number;
  initialBottomC: number;
}

export type DesiccantMaterial = 'silica-rd' | 'komposit-hipotesis';
export type RegenAirSource = 'ambient' | 'exhaust';

export interface DesiccantParams {
  enabled: boolean;
  material: DesiccantMaterial;
  /** Dry desiccant mass per bed [kg] (dual-bed: two of these). */
  bedMassKg: number;
  cycleMin: number;
  /** Fraction of the equilibrium swing realised per cycle [0..1] (range 0,3–0,6, assumption). */
  cycleEffectiveness: number;
  regenAir: RegenAirSource;
  /** Pressure drop per air stream [Pa]. */
  pressureDropPa: number;
  fanEfficiency: number;
  /** Process (fresh) air treated [kg/s dry air]; defaults to hotel.freshAirKgS. */
  processAirKgS?: number;
  /** Regeneration air flow [kg/s dry air]. */
  regenAirKgS: number;
}

export type RouterStrategy = 'dhw-priority' | 'fixed-schedule' | 'adaptive';

export interface ControllerParams {
  strategy: RouterStrategy;
  /** Pump starts when T_collector − T_tank_bottom > onK and stops below offK [K] (hysteresis). */
  onK: number;
  offK: number;
  /** Minimum regeneration temperature before any heat goes to the desiccant [°C]. */
  desiccantMinRegenC: number;
}

export interface CarbonParams {
  /** Grid emission factor [kgCO₂e/kWh_e]. */
  gridKgPerKWhE: number;
  /** LPG combustion factor per fuel energy [kgCO₂e/kWh_fuel]. */
  lpgKgPerKWhFuel: number;
  /** HPWH COP for baseline B2 [-]. */
  hpwhCop: number;
  /** COP of the reference dehumidifying cooling coil (low evaporating temperature) [-]. */
  coilRefCop: number;
  /** COP of the high-temperature after-cooler used with the desiccant [-]. */
  aftercoolerCop: number;
  /** Embodied emissions [kgCO₂e per m² collector] for PV/T and per kWp for plain PV. */
  embodiedPvtKgPerM2: number;
  embodiedPvKgPerKWp: number;
  /** Embodied emissions of router + tank + HX + controller [kgCO₂e]. */
  embodiedBosKg: number;
  /** Embodied emissions of the desiccant unit [kgCO₂e]. */
  embodiedDesiccantKg: number;
  /** B4: share of DHW demand an AC-condenser heat-recovery unit covers [0..1] (assumption, range). */
  condenserRecoveryFraction: number;
  /** B4: extra electricity of the condenser heat-recovery pump per kWh_th recovered [kWh_e/kWh_th]. */
  condenserRecoveryKWhEPerKWhTh: number;
  /** Embodied emissions of the B4 condenser heat-recovery kit [kgCO₂e]; HPWH for B2 [kgCO₂e]. */
  embodiedCondenserKitKg: number;
  embodiedHpwhKg: number;
  /** Equipment lifetime for annualising embodied emissions [years]. */
  lifetimeYears: number;
}

export interface EconomicParams {
  gridTariffIdrPerKWh: number;
  lpgPriceIdrPerKg: number;
  /** Capex ranges [IDR] — low / mid / high (assumptions). */
  capexPvtIdrPerM2: [number, number, number];
  capexBosIdr: [number, number, number];
  capexDesiccantIdr: [number, number, number];
  omFractionPerYear: number;
}

export interface SystemInputs {
  hotel: HotelParams;
  array: ArrayParams;
  tank: TankParams;
  desiccant: DesiccantParams;
  controller: ControllerParams;
  carbon: CarbonParams;
  economics: EconomicParams;
  /** Optional heat-pump source mode for night/rain (research option, evaluated vs B2). */
  heatPumpSource: { enabled: boolean; carnotFraction: number };
}

// ─────────────────────────────────────────────────────────────────────────────
// Router
// ─────────────────────────────────────────────────────────────────────────────
/**
 * Heat destinations of the router. 'dhw' = direct to the DHW preheat HX during a draw.
 * 'bypass' = heat deliberately not used (dumped/extract-less) so the cells run cooler — its value is the PV gain.
 */
export type Sink = 'dhw' | 'desiccant' | 'tank' | 'bypass';
/** A strong sun / heat available · B weak sun & humid: stored heat only, desiccant usually unavailable · C no collection. */
export type ControllerMode = 'A' | 'B' | 'C';

export type RouterReason =
  | 'pompa-mati-kolektor-lebih-dingin' // collector not warmer than tank → pump off
  | 'prioritas-air-panas'
  | 'isi-tangki'
  | 'regenerasi-desikan'
  | 'desikan-terlalu-dingin'
  | 'tangki-penuh-bypass' // tank truly full (SoC near max)
  | 'fluida-belum-cukup-panas' // charge fluid not warm enough for the tank → dry cooler (cells cooler)
  | 'jadwal-tetap'
  | 'lepas-simpanan'; // mode C/B: tank discharges to DHW

export interface RouterInput {
  /**
   * Heat the running collector would deliver at the current inlet [W_th] (≥ 0).
   * collectorOutletC below = the collector SENSOR temperature: with the pump off it is the stagnant
   * absorber/cell temperature (start decision, onK); with the pump running it is the outlet (stop, offK).
   */
  qAvailableW: number;
  collectorOutletC: number;
  tankTopC: number;
  tankBottomC: number;
  tankMaxC: number;
  /** DHW preheat demand right now [W_th] (what the draw could absorb). */
  dhwDemandW: number;
  /** Desiccant wants regeneration (bed not dry) and is enabled. */
  desiccantWanted: boolean;
  irradiance: number;
  hourOfDay: number;
  params: ControllerParams;
  /** Previous state for hysteresis. */
  prev?: RouterState;
  /** Heat the tank can accept now [W_th] (headroom; 0 if the charge fluid is not warmer than the tank bottom). */
  tankAcceptW?: number;
  /** Value gate: desiccant saves more kWh_e per kWh_th than dumping the heat for cooler cells. */
  desiccantPreferred?: boolean;
  /** Real fluid temperature available for regeneration [°C] (collectorOutletC may be a cell-sensor value). */
  regenSourceC?: number;
  /** Why the tank refuses heat: truly full, or the charge fluid is too cold for it. */
  tankRefusal?: 'full' | 'cold';
}

export interface RouterState {
  mode: ControllerMode;
  pumpOn: boolean;
  /** Heat allocated per sink [W_th]; Σ = qAvailableW when pumpOn, else all 0. */
  allocW: Record<Sink, number>;
  /** Valve opening fractions [0..1], Σ = 1 when pumpOn (animation uses these). */
  valves: Record<Sink, number>;
  reason: RouterReason;
}

// ─────────────────────────────────────────────────────────────────────────────
// Time stepping
// ─────────────────────────────────────────────────────────────────────────────
export interface TankState {
  topC: number;
  bottomC: number;
  /** State of charge [0..1] between mains and maxC. */
  soc: number;
  lossW: number;
}

export interface DayStep {
  /** Hours since scenario start (0..24 or 0..72). */
  t: number;
  hourOfDay: number;
  climate: ClimatePoint;
  router: RouterState;
  collector: {
    inletC: number;
    outletC: number;
    cellC: number;
    /** Array totals. */
    electricalW: number;
    qLiquidW: number;
    pumpW: number;
    etaThermal: number;
    etaElectrical: number;
  };
  tank: TankState;
  dhw: {
    drawLph: number;
    demandW: number;
    fromCollectorW: number;
    fromTankW: number;
    /** Existing heater output that tops up to setpoint [W_th]. */
    backupW: number;
    /** Always 0 by design (service guarantee); tests assert it. */
    unmetW: number;
    /** Potable temperature leaving the solar HX chain, before the existing heater [°C]. */
    potableOutC?: number;
    tankSourceC?: number;
    collectorSourceC?: number;
  };
  desiccant: {
    /** Remaining dry capacity [0..1]. */
    capacity: number;
    regenW: number;
    moistureRemovedKgH: number;
    available: boolean;
  };
  hvac: {
    /** Electricity of the reference coil treating the fresh air [W_e]. */
    refWe: number;
    /** Electricity with desiccant path incl. after-cooler + fans [W_e]. */
    withDesiccantWe: number;
  };
  heatPump?: { on: boolean; cop: number; sourceW: number; workWe: number };
}

export interface DayTotals {
  pvKWhE: KWhE;
  /** Added electricity in the headline: circulation pumps + controller only (NOT heat-pump work; desiccant fans/after-cooler live inside hvacSavedKWhE). */
  parasiticKWhE: KWhE;
  collectedKWhTh: KWhTh;
  dhwDemandKWhTh: KWhTh;
  /** Solar-derived DHW heat delivered (collector + tank + heat-pump-source condenser output). */
  dhwSolarKWhTh: KWhTh;
  dhwBackupKWhTh: KWhTh;
  unmetKWhTh: KWhTh;
  desiccantRegenKWhTh: KWhTh;
  bypassKWhTh: KWhTh;
  tankLossKWhTh: KWhTh;
  tankDeltaKWhTh: KWhTh;
  /** dhwSolar / dhwDemand [0..1]. */
  solarFraction: number;
  moistureRemovedKg: number;
  /** HVAC electricity saved by the desiccant path (negative = penalty) [kWh_e]. */
  hvacSavedKWhE: KWhE;
  heatPumpWorkKWhE?: KWhE;
}

export interface DayResult {
  scenario: DayScenarioId;
  strategy: RouterStrategy;
  dtH: number;
  steps: DayStep[];
  totals: DayTotals;
  /** First-law closure of the tank over the scenario [kWh_th]; |x| small. */
  energyClosureErrorKWh: number;
}

export interface AnnualResult {
  /** Day-type weights used [days/year], with source. */
  weights: { scenario: Exclude<DayScenarioId, 'hujan-3-hari'>; days: number }[];
  strategy: RouterStrategy;
  totals: DayTotals; // annual sums, same units
}

export interface AreaSweepPoint {
  areaM2: number;
  strategy: RouterStrategy;
  dhwSolarKWhThPerYear: KWhTh;
  bypassKWhThPerYear: KWhTh;
  netKgPerYear: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Desiccant research path
// ─────────────────────────────────────────────────────────────────────────────
export type Verdict = 'layak' | 'marginal' | 'tidak-layak';

export interface DesiccantEvalInput {
  regenC: number;
  process: { tC: number; humidityRatio: number };
  regenAir: RegenAirSource;
  ambient: ClimatePoint;
  params: DesiccantParams;
  hotel: HotelParams;
  carbon: CarbonParams;
  /** PV electrical penalty for running the collector hotter to reach regenC [W_e] (from simulate()). */
  pvPenaltyWe?: number;
  /** Pump power of the regeneration loop [W_e]. */
  pumpWe?: number;
}

export interface DesiccantEval {
  regenC: number;
  regenAirRh: number;
  /** Equilibrium uptakes [kg water / kg desiccant]. */
  uptakeProcess: number;
  uptakeRegen: number;
  swing: number;
  effectiveSwing: number;
  moistureRemovedKgH: number;
  processOut: { tC: number; humidityRatio: number };
  latentRemovedW: number;
  regenHeatW: number;
  /** latentRemovedW / regenHeatW. */
  thermalCop: number;
  hvac: {
    coilRefWe: number;
    aftercoolerWe: number;
    fanWe: number;
    pumpWe: number;
    pvPenaltyWe: number;
    /** coilRef − (aftercooler + fan + pump + pvPenalty) [W_e]; > 0 means real saving. */
    netSavingWe: number;
  };
  /**
   * Same dehumidification duty, two routes, per kg of water removed [kWh_e/kg]:
   * the desiccant path (after-cooler + fans + pump + PV penalty) vs the reference compressor coil.
   * Answers: would PV electricity in an efficient compressor beat routing low-grade heat to desiccant?
   */
  perKgWater: { desiccantKWhE: number; coilRefKWhE: number };
  verdict: Verdict;
  /** False when the bed removes (almost) no water at this regeneration temperature — the unit should not run. */
  operating: boolean;
  /** After-cooler/coil COP ratio at which netSavingWe = 0 for these conditions (null if no root). */
  breakEvenCopRatio: number | null;
  /** Hours a fully dry bed can dehumidify without regeneration. */
  autonomyH: number;
  tag: EvidenceTag;
  refIds: RefIdLike[];
}

/** Value of using 1 kWh_th of recovered heat (or the equivalent PV electricity) in each way. */
export type HeatUse =
  | 'dhw-lpg'
  | 'dhw-heat-pump'
  | 'dhw-electric'
  | 'desiccant'
  /** Dump the heat (bypass / run cells cooler) and gain PV electricity instead. */
  | 'pv-lebih-dingin';

export interface HeatUseValue {
  use: HeatUse;
  label: string;
  /** Avoided emissions per kWh_th routed (or per kWh_th-equivalent) [kgCO₂e]. */
  kgPerKWhTh: number;
  note: string;
  tag: EvidenceTag;
}

// ─────────────────────────────────────────────────────────────────────────────
// Carbon & economics vs baselines
// ─────────────────────────────────────────────────────────────────────────────
/** B1 conventional hotel · B2 PV + HPWH + efficient HVAC · B3 PV/T DHW only · B4 AC-condenser heat recovery for DHW. */
export type BaselineId = 'B1' | 'B2' | 'B3' | 'B4';

export interface LedgerRow {
  id: string;
  /** Indonesian label. */
  label: string;
  kind: 'avoided' | 'embodied' | 'parasitic' | 'standby';
  /** Signed: + = emissions avoided vs the baseline, − = emissions added [kgCO₂e/yr]. */
  kgPerYear: number;
  energy?: { kWhTh?: KWhTh; kWhE?: KWhE; kWhFuel?: KWhFuel };
  /** The factor that converted energy to carbon, shown next to the row. */
  factor?: { value: number; unit: string; refId?: RefIdLike };
  tag: EvidenceTag;
  refId?: RefIdLike;
  /** Excluded from the headline net (e.g. desiccant research row). */
  excludedFromHeadline?: boolean;
}

export interface CarbonLedger {
  baselineId: BaselineId;
  rows: LedgerRow[];
  grossAvoidedKgPerYear: number;
  /** Penalty magnitudes (≥ 0): net = gross − embodied − parasitic. */
  embodiedKgPerYear: number;
  parasiticKgPerYear: number;
  /** Σ rows not excluded from headline. */
  netKgPerYear: number;
  /** Lifetime embodied / net; Infinity if net ≤ 0. */
  carbonPaybackYears: number;
}

export interface EconomicsResult {
  baselineId: BaselineId;
  capexIdr: [number, number, number];
  annualSavingIdr: number;
  /** Simple payback [years] low/mid/high; Infinity if saving ≤ 0. */
  paybackYears: [number, number, number];
  tag: EvidenceTag;
}

/**
 * Everything compareBaselines needs, prepared by day.ts (baselineInputs). All cases deliver the same
 * DHW energy at setpoint, the same electricity demand and the same indoor humidity (equal service).
 */
export interface BaselineInputs {
  /** SolarVein: PV/T + adaptive router (+ desiccant row, excluded from headline). */
  solarvein: AnnualResult;
  /** B3: same PV/T area, DHW-priority, no desiccant, no adaptive routing. */
  pvtDhwOnly: AnnualResult;
  /** B2/B4: plain PV on the same roof area (conventional-pv config, own cell temperature). */
  conventionalPvKWhEPerYear: KWhE;
  /** Annual DHW demand at setpoint [kWh_th] (same for every case). */
  dhwDemandKWhThPerYear: KWhTh;
  areaM2: number;
}

export interface BaselineComparison {
  ledgers: Record<BaselineId, CarbonLedger>;
  economics: Record<BaselineId, EconomicsResult>;
  /** Generated Indonesian sentence, derived from the numbers (no default winner). */
  verdict: string;
  /** B4 condenser-recovery fraction at which SolarVein and B4 tie (null if none in 0..1). */
  b4BreakEvenFraction?: number | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// View helpers (views.ts) — what sections consume
// ─────────────────────────────────────────────────────────────────────────────
export interface RouterSnapshot {
  mode: ControllerMode;
  pumpOn: boolean;
  valves: Record<Sink, number>;
  allocW: Record<Sink, number>;
  tankSoc: number;
  tankTopC: number;
  reason: RouterReason;
}

export interface ModeBand {
  mode: ControllerMode;
  t0: number;
  t1: number;
}

/** Presentation / UI mode targets: a condition (scenario + time), NOT a promised outcome. */
export type ModeTarget = 'A' | 'B' | 'C';

/** Indonesian labels for every slug shown in the UI. */
export interface LabelMaps {
  mode: Record<ControllerMode, string>;
  modeTarget: Record<ModeTarget, string>;
  sink: Record<Sink, string>;
  reason: Record<RouterReason, string>;
  verdict: Record<Verdict, string>;
  evidence: Record<EvidenceTag, string>;
  scenario: Record<DayScenarioId, string>;
  strategy: Record<RouterStrategy, string>;
  baseline: Record<BaselineId, string>;
}

// ─────────────────────────────────────────────────────────────────────────────
// Public v2 API — implemented by the module owners, re-exported by ./index.ts (lead)
// ─────────────────────────────────────────────────────────────────────────────
// hotel.ts      (W2a): DEFAULT_SYSTEM: SystemInputs; HOTEL_PRESETS: Record<'hotel-100'|'penginapan-kecil', HotelParams>;
//                      climateAt(scenario: DayScenarioId, t: number): ClimatePoint;
//                      dhwDrawAt(hotel: HotelParams, hourOfDay: number): { drawLph: number; demandW: number }
// psychro.ts    (lead, done): saturationPressureKPa(tC), humidityRatio(tC, rh, pKPa?), relativeHumidity(tC, w, pKPa?),
//                      enthalpyKJkg(tC, w), dewPointC(w, pKPa?)
// tank.ts       (W2a): stepTank(s: TankState, p: TankParams, f: { chargeW: number; chargeC: number;
//                      dischargeW: number; mainsC: number; ambientC: number }, dtH: number): TankState; initialTank(p, mainsC)
// dhw.ts        (W2a): preheatW(drawLph, sourceC, mainsC, setpointC, effectiveness): number
// heatpump.ts   (W2a): heatPumpCop(sourceC, sinkC, carnotFraction): number
// router.ts     (W2b): allocate(input: RouterInput): RouterState
// day.ts        (W2b): simulateSystem(sys: SystemInputs, scenario: DayScenarioId, opts?: { strategy?: RouterStrategy; dtH?: number }): DayResult
//                      simulateYear(sys: SystemInputs, strategy?: RouterStrategy): AnnualResult
//                      areaSweep(sys: SystemInputs, areasM2: number[], strategies: RouterStrategy[]): AreaSweepPoint[]
// desiccant.ts  (W3) : isothermUptake(material, rh, tC): number; evaluateDesiccant(i: DesiccantEvalInput): DesiccantEval;
//                      desiccantSweep(base: DesiccantEvalInput, regenTemps: number[]): DesiccantEval[]
//                      baselineInputs(sys: SystemInputs): BaselineInputs
// carbon.ts     (W4) : compareBaselines(sys: SystemInputs, b: BaselineInputs): BaselineComparison
//                      heatUseValues(sys: SystemInputs, x: { desiccant: DesiccantEval; pvGainWePerWth: number }): HeatUseValue[]
// economics.ts  (W4) : economicsFor(sys: SystemInputs, ledger: CarbonLedger, b: BaselineInputs): EconomicsResult
// assumptions/<module>.ts (owner of the module): export const <MODULE>_ASSUMPTIONS: AssumptionEntry[]
// views.ts      (W11): LABELS: LabelMaps; MODE_TARGETS: Record<ModeTarget, { scenario: DayScenarioId; hour: number }>;
//                      stepAt(day, t): DayStep (interpolated); routerSnapshot(step): RouterSnapshot; modeBands(day): ModeBand[];
//                      pumpStarts(day): number; stackedAlloc(day); desiccantInputFor(sys, scenario, t, regenAir);
//                      pvGainWePerWth(sys); finiteOrNull(x); createSystemView(sys) (memoised lazy tiers)
