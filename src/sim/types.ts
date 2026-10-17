/**
 * SolarVein Liquid — simulation contract (shared by all modules).
 *
 * RULES
 *  - Exported names here are a stable contract. Fields may be ADDED (prefer optional),
 *    never renamed or removed without the lead's agreement.
 *  - All temperatures in °C, powers in W, areas in m², flows as stated per field.
 *  - SIGN CONVENTION (used everywhere, UI included):
 *      qLiquidW > 0  → heat flows panel → liquid  (HEAT HARVEST)
 *      qLiquidW < 0  → heat flows liquid → panel → environment (HEAT REJECTION)
 *      qFrontLossW / qBackLossW / qRainW > 0 → heat leaves the panel to the environment
 *  - Fluid flow direction is independent of heat-flow direction. The liquid ALWAYS
 *    circulates inlet → outlet; only the sign of qLiquidW changes.
 *  - Thermal watts (W_th) and electrical watts (W_e) are never summed into one number
 *    without an explicit conversion factor (boiler efficiency, cooling COP, …).
 */

/** Which hardware configuration is being simulated. */
export type CollectorConfig =
  /** Conventional standalone PV module: no heat exchanger, open (air-cooled) rear side. */
  | 'conventional-pv'
  /** PVT with rear exchanger + insulation; pump runs only when heat can be HARVESTED into a load. */
  | 'pvt-harvest-only'
  /** SolarVein: same PVT hardware; controller may run the pump to harvest OR to reject heat. */
  | 'solarvein-dual'
  /**
   * v2 collector: same PV/T hardware, HARVEST ONLY — never rejects heat. With pumpControl 'auto' the pump
   * runs only when harvesting is worth it (heat load available); with 'on' it runs regardless (the system
   * controller decides; qLiquidW < 0 then means the loop is being cooled by the collector, and it never
   * classifies as 'reject'). With G = 0 and a cold loop it is the heat-pump SOURCE mode (environment → liquid).
   */
  | 'pvt-liquid';

/** Pump command. 'auto' = rule-based controller decides (see physics docs). */
export type PumpControl = 'auto' | 'on' | 'off';

/** Thermal regime classified from the computed (signed) liquid heat flow. */
export type ThermalRegime =
  /** qLiquidW meaningfully > 0 and a heat load exists. */
  | 'harvest'
  /** qLiquidW meaningfully < 0 and a hot source needing rejection exists. */
  | 'reject'
  /** Pump running but |qLiquidW| too small / not beneficial versus pump power. */
  | 'negligible'
  /** Pump off (stagnation, or conventional PV). */
  | 'idle';

export interface SimInputs {
  /** Plane-of-array irradiance G [W/m²]. */
  irradiance: number;
  /** Ambient air temperature [°C]. */
  ambientC: number;
  /** Rain intensity [mm/h]. 0 = dry. */
  rainMmH: number;
  /** Wind speed at panel [m/s]. */
  windMs: number;
  /** Liquid inlet temperature [°C] (return from the thermal load / warm process loop). */
  inletC: number;
  /** Volumetric liquid flow [L/min] (water). Mass flow derived with ρ(T). */
  flowLpm: number;
  /** Effective collector aperture area [m²]. */
  areaM2: number;
  /** Absorber-to-fluid thermal conductance per unit area U_pf [W/(m²·K)]. */
  uPlateFluid: number;
  /** Hydraulic loop pressure drop at the reference flow of 2 L/min [kPa] (scaled ∝ V̇²). */
  pressureDropKPa: number;
  /** Pump wire-to-water efficiency [-]. */
  pumpEfficiency: number;
  /** Pump command. */
  pumpControl: PumpControl;
  /** PV reference efficiency at STC (25 °C cell) [-]. */
  etaRef: number;
  /** PV power temperature coefficient β [1/K] (positive number, e.g. 0.0035 = −0.35 %/K). */
  betaPerK: number;
  /** A thermal load that can USE heat at the outlet temperature exists (e.g. DHW preheat). */
  heatLoadAvailable: boolean;
  /** A warm process loop that NEEDS heat rejection exists (the inlet represents its return). */
  hotSourceAvailable: boolean;
  /** Efficiency of the fossil heater displaced by harvested heat [-] (e.g. LPG boiler 0.85). */
  boilerEfficiency: number;
  /** COP of the cooling equipment displaced by rejected heat [-] (W_th removed per W_e). */
  coolingCOP: number;
  /**
   * OPTIONAL ambient humidity ratio w [kg/kg dry air]. When given, SimResult.qCondensationUpperW reports a
   * one-sided upper bound of latent gain if the glass is below the dew point (not part of the energy balance).
   */
  humidityRatio?: number;
}

/** One node of the through-thickness temperature profile (front → back). */
export interface TemperatureNode {
  id: 'ambient' | 'glass' | 'cell' | 'absorber' | 'fluid' | 'back' | 'sky';
  /** Indonesian label for UI. */
  label: string;
  tempC: number;
}

export type AdvisorySeverity = 'info' | 'warning' | 'critical';

export interface Advisory {
  /** Stable machine code, e.g. 'REJECTION_NOT_BENEFICIAL', 'NO_HOT_SOURCE', 'LOW_IRRADIANCE'. */
  code: string;
  severity: AdvisorySeverity;
  /** Natural Indonesian message shown verbatim in the UI. */
  message: string;
}

export interface SimResult {
  /** Inputs after clamping to safe ranges (UI should display these). */
  inputs: SimInputs;
  config: CollectorConfig;
  pumpOn: boolean;
  regime: ThermalRegime;

  // ── Temperatures [°C] ─────────────────────────────────────────
  /** PV cell temperature (lumped PV + absorber node). */
  cellC: number;
  /** Panel temperature the same hardware would reach with the pump OFF (stagnation). */
  stagnationC: number;
  inletC: number;
  outletC: number;
  /** T_out − T_in [K]. Positive in harvest, negative in rejection. */
  deltaFluidK: number;
  /** Through-thickness profile for gradient visualisation, ordered front → back. */
  profile: TemperatureNode[];

  // ── Flow ──────────────────────────────────────────────────────
  massFlowKgS: number;

  // ── Power [W] ─────────────────────────────────────────────────
  /** G × A (thermal-equivalent radiant power on the aperture). */
  solarInputW: number;
  /** Optical losses (reflection/transmission) — not absorbed. */
  opticalLossW: number;
  /** Absorbed radiant power (τα × G × A). */
  absorbedW: number;
  /** PV DC electrical output [W_e]. */
  electricalW: number;
  /** Actual electrical efficiency P_e / (G·A) [-]; NaN-safe (0 when G = 0). */
  etaElectrical: number;
  /** Signed heat into the liquid [W_th] (see sign convention). */
  qLiquidW: number;
  /**
   * Same as qLiquidW but recomputed with rainMmH = 0 (everything else equal, same pump state).
   * qLiquidW − qLiquidNoRainW is the rain contribution (negative = more heat leaves the liquid).
   */
  qLiquidNoRainW?: number;
  /**
   * OPTIONAL. One-sided UPPER BOUND of latent condensation gain on the glass [W_th] (Lewis analogy), only when
   * inputs.humidityRatio is given and the glass is below the air dew point; 0 otherwise. Report-only, NOT in the
   * energy balance, "batas atas, belum divalidasi".
   */
  qCondensationUpperW?: number;
  /** Front-surface convective + radiative heat loss, excluding rain [W_th], signed. */
  qFrontLossW: number;
  /** Sensible heat carried away by rain [W_th], signed. */
  qRainW: number;
  /** Rear heat loss [W_th], signed. */
  qBackLossW: number;
  /** Pump electrical consumption [W_e] (0 when off). */
  pumpW: number;
  /** electricalW − pumpW [W_e]. */
  netElectricalW: number;
  /** Energy-balance residual absorbed − (Pe + qLiquid + losses) [W]; should be ≈ 0. */
  energyBalanceResidualW: number;

  // ── Valuation (only counted when a real load/source exists) ───
  /** Harvested heat actually delivered to a load [W_th] (≥ 0). */
  usefulHeatW: number;
  /** Heat actually removed from a hot process loop [W_th] (≥ 0). */
  heatRejectedW: number;
  /** Fuel power displaced by usefulHeatW: usefulHeatW / boilerEfficiency [W_fuel]. */
  avoidedFuelW: number;
  /** Cooling electricity displaced by heatRejectedW: heatRejectedW / coolingCOP [W_e]. */
  avoidedCoolingElecW: number;
  /** avoidedCoolingElecW − pumpW [W_e]; negative ⇒ rejection is not worth it. */
  netCoolingBenefitW: number;

  // ── Transparency ──────────────────────────────────────────────
  /** Coefficients actually used, for the assumptions panel [W/(m²·K)]. */
  coefficients: {
    hConvFront: number;
    hRadFront: number;
    hRain: number;
    uBack: number;
    uPlateFluid: number;
    /** Series conductance cell → glass surface (glass + EVA laminate) [W/(m²·K)]. */
    uCellGlass?: number;
    ntu: number;
    effectiveness: number;
  };
  advisories: Advisory[];
}

/** Hourly (quasi-steady) point for the day-profile time history. */
export interface DayPoint {
  hour: number;
  irradiance: number;
  ambientC: number;
  rainMmH: number;
  result: SimResult;
}

/** Carbon / energy displacement assumptions (all user-configurable). */
export interface CarbonAssumptions {
  /** Grid emission factor [kgCO2e/kWh_e]. */
  gridKgPerKWh: number;
  /** Fuel emission factor of the displaced heater [kgCO2e/kWh_fuel] (e.g. LPG ≈ 0.23). */
  fuelKgPerKWh: number;
  /** Equivalent full-load operating hours per year for the scenario [h/yr]. */
  hoursPerYear: number;
  /** Embodied emissions of the whole SolarVein unit [kgCO2e] (never zero). */
  embodiedKg: number;
  /** Whether a cooling system is explicitly being displaced by heat rejection. */
  coolingDisplacementModeled: boolean;
  /**
   * Embodied emissions ADDED by the exchanger/insulation/pump relative to a plain PV module [kgCO2e],
   * used for the incremental-vs-conventional payback. Optional; default 180.
   */
  incrementalEmbodiedKg?: number;
}

export interface CarbonResult {
  electricityKgPerYear: number;
  heatKgPerYear: number;
  coolingKgPerYear: number;
  pumpKgPerYear: number;
  netKgPerYear: number;
  /** Years to repay embodied emissions; Infinity if net ≤ 0. */
  carbonPaybackYears: number;
  /** Net yearly credit minus the conventional-PV baseline's net credit [kgCO2e/yr]. Present when a baseline is given. */
  incrementalNetKgPerYear?: number;
  /** incrementalEmbodiedKg / incrementalNetKgPerYear; Infinity if ≤ 0. Present when a baseline is given. */
  incrementalPaybackYears?: number;
}
