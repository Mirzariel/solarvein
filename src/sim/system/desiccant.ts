/**
 * SolarVein v2 — desiccant research path (W3). Status: HIPOTESIS RISET, belum divalidasi.
 *
 * Question answered honestly: can low-grade PV/T heat (35–55 °C, swept to 70 °C) regenerate a solid
 * desiccant bed that dehumidifies hotel fresh air, and does that reduce AC electricity after the NET
 * balance (after-cooler, fans on both streams, pump, PV penalty)?
 *
 * Physics (see docs/physics/desiccant.md):
 *  - Isotherm: RD silica gel, Pesaran & Mills (1987) fourth-degree fit to Davison data, RH = f(W) at
 *    25 °C, with the temperature dependence added through the isosteric heat (Clausius–Clapeyron at
 *    constant uptake). Polynomial + heat of adsorption: terbit; temperature extrapolation: asumsi.
 *  - Adsorption is ~isenthalpic: dried air leaves HOTTER. "Latent removed" alone is never the benefit.
 *  - Benefit = reference coil electricity − (after-cooler + residual coil + fans + pump + PV penalty).
 *
 * PV penalty: `pvPenaltyWe` must be computed by the CALLER (day.ts) versus the real alternative (what the collector
 * would do at its normal operating point instead of running hot for regeneration). Standalone sweeps leave it at 0, which
 * makes the net balance an upper bound (a note says so).
 *
 * Pure TypeScript, no DOM. Units: °C, W, kg, kg/kg dry air, kJ/kg for enthalpy, kg/kg for uptake.
 */
import type {
  ClimatePoint,
  DesiccantEval,
  DesiccantEvalInput,
  DesiccantMaterial,
  EvidenceTag,
  RefIdLike,
  Verdict,
} from './contract';
import {
  dewPointC,
  enthalpyKJkg,
  humidityRatio,
  latentHeatKJkg,
  relativeHumidity,
} from './psychro';

// ─────────────────────────────────────────────────────────────────────────────
// Constants (all documented in docs/physics/desiccant.md; tags in assumptions/desiccant.ts)
// ─────────────────────────────────────────────────────────────────────────────
/** Source id (to be aligned with src/sim/references.ts by R0/lead). */
export const REF_PESARAN_MILLS_1987: RefIdLike = 'pesaran-mills-1987';

/** Reference temperature of the manufacturer isotherm data behind the polynomial [°C] (asumsi). */
export const ISOTHERM_T_REF_C = 25;
/** Maximum moisture content of RD silica gel [kg/kg] (Pesaran & Mills, Table 1). */
export const W_MAX = 0.4;
/** Lower end of the polynomial's monotone range [kg/kg]; below it the isotherm is linear (Henry). */
const W_LO = 0.0012;
/** Water-vapour gas constant [J/(kg K)]. */
const R_W = 461.5;
/** Latent heat of vaporisation used to split heat of adsorption into condensation + wetting [kJ/kg] (≈ 25 °C). */
const L_REF = 2442;

/** Hotel exhaust air used as an alternative regeneration stream (plan: ≈ 25 °C, w ≈ 0,010). */
export const EXHAUST_AIR = { tC: 25, humidityRatio: 0.01 } as const;
/** Supply dry-bulb above the supply dew point [K]; both routes end in this same state (asumsi). */
export const SUPPLY_DB_MARGIN_K = 5;
/** Air density for fan power [kg/m³] (30 °C, sea level ≈ 1,15). */
const RHO_AIR = 1.15;
/** Dry-bed specific heat [kJ/(kg K)] and of adsorbed water (Pesaran & Mills: c = 921 + 4178 W J/kgK). */
const CP_DRY_GEL = 0.921;
const CP_WATER = 4.186;
/** Metal / matrix mass (heat-exchanger-type bed) per kg of dry desiccant and its cp (asumsi). */
export const BED_METAL_MASS_RATIO = 0.5;
const CP_METAL = 0.9;
/** Share of the bed's excess sensible heat (regenC − T_process) handed to the process air each phase (asumsi). */
export const BED_CARRYOVER_FRACTION = 0.4;
/** Regeneration air must stay below this RH at the bed outlet (no condensation in the bed) and
 *  leave at least this many K above its own inlet (the heater only ever adds heat). */
const REGEN_OUT_RH_MAX = 0.95;
const REGEN_OUT_APPROACH_K = 3;
/** Lower bound on the moisture basis of per-kg figures [kg/h]; avoids ÷0 when the bed does nothing. */
const PER_KG_FLOOR_KGH = 1e-3;
/** Below this removal rate the unit is considered not operating [kg/h]. */
export const OPERATING_MIN_KGH = 0.01;
/** ...or when it covers less than this share of the moisture duty (a controller would not start the unit) (asumsi). */
export const OPERATING_MIN_COVERAGE = 0.05;

/** Verdict thresholds (documented). */
export const VERDICT = {
  /** Effective equilibrium swing below this ≈ 0 [kg/kg]. */
  swingMin: 0.01,
  /** Net saving below this share of the reference coil electricity = marginal. */
  marginalShare: 0.15,
  /** Thermal COP below this = marginal even if net saving is positive. */
  thermalCopMin: 0.3,
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// Isotherm
// ─────────────────────────────────────────────────────────────────────────────
/** Pesaran & Mills (1987) Eq. A-1: RH(W) for RD silica gel at the reference temperature (W in kg/kg). */
function rhPoly(w: number): number {
  return 0.0078 - 0.05759 * w + 24.16554 * w ** 2 - 124.478 * w ** 3 + 204.226 * w ** 4;
}

/** Heat of adsorption of water on RD silica gel [kJ/kg water] (Pesaran & Mills, Eq. A-3). */
export function heatOfAdsorptionKJkg(w: number): number {
  return w <= 0.05 ? 3500 - 12400 * w : 2950 - 1400 * w;
}

/**
 * Relative humidity in equilibrium with uptake W at temperature T. Constant-uptake Clausius–Clapeyron:
 * p_v(W,T) = p_v(W,Tref)·exp[−(Qst/Rw)(1/T−1/Tref)] and p_s likewise with L, hence
 * RH(W,T) = RH_ref(W)·exp[−((Qst−L)/Rw)(1/T−1/Tref)]: the heat of wetting (Qst−L) makes the bed give
 * water up at a lower vapour pressure when hotter — that is what regeneration exploits.
 */
function rhAtUptake(w: number, tC: number): number {
  const wetting = Math.max(0, heatOfAdsorptionKJkg(w) - L_REF) * 1000; // J/kg
  const k = (wetting / R_W) * (1 / (tC + 273.15) - 1 / (ISOTHERM_T_REF_C + 273.15));
  return rhPoly(w) * Math.exp(-k);
}

/**
 * Equilibrium uptake [kg water / kg dry desiccant] at relative humidity `rh` [0..1] and temperature `tC`.
 * Monotone increasing in RH, decreasing in T, bounded to [0, W_MAX].
 * 'komposit-hipotesis': NO validated isotherm exists; the silica-gel curve is returned as a reference
 * only (callers must label the result 'hipotesis'; evaluateDesiccant does).
 */
export function isothermUptake(_material: DesiccantMaterial, rh: number, tC: number): number {
  const r = Math.min(Math.max(Number.isFinite(rh) ? rh : 0, 0), 1);
  const rLo = rhAtUptake(W_LO, tC);
  if (r <= rLo) return (r / rLo) * W_LO; // Henry region: linear to zero
  if (r >= rhAtUptake(W_MAX, tC)) return W_MAX;
  let lo = W_LO;
  let hi = W_MAX;
  for (let k = 0; k < 50; k++) {
    const mid = (lo + hi) / 2;
    if (rhAtUptake(mid, tC) < r) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}

/** RH of air in equilibrium with a bed holding uptake `w` at `tC` (inverse of isothermUptake). */
export function equilibriumRh(w: number, tC: number): number {
  const r = w < W_LO ? rhAtUptake(W_LO, tC) * (Math.max(w, 0) / W_LO) : rhAtUptake(Math.min(w, W_MAX), tC);
  return Math.min(1, Math.max(0, r));
}

// ─────────────────────────────────────────────────────────────────────────────
// Extended result (a superset of the contract's DesiccantEval; assignable to it)
// ─────────────────────────────────────────────────────────────────────────────
export type DesiccantLimiter = 'bed' | 'process-air' | 'keseimbangan' | 'udara-regenerasi' | 'tidak-ada';

export interface DesiccantEvalDetail extends DesiccantEval {
  /** Indonesian notes: limiting factor, labels, caveats. Shown in the Lab / Desikan section. */
  notes: string[];
  limiter: DesiccantLimiter;
  /** Mean bed temperature during adsorption [°C] and the driest humidity ratio the process air could reach there. */
  bedMeanC: number;
  equilibriumHumidityRatio: number;
  /** Water the process air carries above the supply target [kg/h] (the most the desiccant could remove). */
  requiredMoistureKgH: number;
  /** moistureRemoved / required [0..1]. */
  coverage: number;
  regenIn: { tC: number; humidityRatio: number };
  /** Regeneration air leaving the bed (after desorption cooling). */
  regenOut: { tC: number; humidityRatio: number; rh: number };
  /** Breakdown of what the regeneration air's heat is spent on [W_th]. */
  regenHeatBreakdownW: { desorption: number; bedSensible: number; exhaustLoss: number };
  /** Supply (target) state both routes end in. */
  supply: { tC: number; humidityRatio: number };
  /** Temperature rise of the process air across the bed [K]. */
  processDeltaTK: number;
  /** Duty split of the desiccant route [W_th]. */
  dutyW: { coilRef: number; aftercooler: number; residualCoil: number };
  /**
   * Net electricity saved per kWh_th of regeneration heat spent [kWh_e/kWh_th] (≤ 0 when nothing is saved).
   * This is the number to compare with DHW, heat-pump DHW and "PV cooler" uses of the same heat.
   */
  savedKWhEPerKWhTh: number;
}

const zeroEval = (i: DesiccantEvalInput, notes: string[]): DesiccantEvalDetail => ({
  operating: false,
  breakEvenCopRatio: null,
  regenC: i.regenC,
  regenAirRh: 0,
  uptakeProcess: 0,
  uptakeRegen: 0,
  swing: 0,
  effectiveSwing: 0,
  moistureRemovedKgH: 0,
  processOut: { ...i.process },
  latentRemovedW: 0,
  regenHeatW: 0,
  thermalCop: 0,
  hvac: { coilRefWe: 0, aftercoolerWe: 0, fanWe: 0, pumpWe: 0, pvPenaltyWe: 0, netSavingWe: 0 },
  perKgWater: { desiccantKWhE: 0, coilRefKWhE: 0 },
  verdict: 'tidak-layak',
  autonomyH: 0,
  tag: 'hipotesis',
  refIds: [],
  notes,
  limiter: 'tidak-ada',
  bedMeanC: 0,
  equilibriumHumidityRatio: 0,
  requiredMoistureKgH: 0,
  coverage: 0,
  regenIn: { tC: 0, humidityRatio: 0 },
  regenOut: { tC: 0, humidityRatio: 0, rh: 0 },
  regenHeatBreakdownW: { desorption: 0, bedSensible: 0, exhaustLoss: 0 },
  supply: { tC: 0, humidityRatio: 0 },
  processDeltaTK: 0,
  dutyW: { coilRef: 0, aftercooler: 0, residualCoil: 0 },
  savedKWhEPerKWhTh: 0,
});

// ─────────────────────────────────────────────────────────────────────────────
// helpers
// ─────────────────────────────────────────────────────────────────────────────
/** Dry-bulb of moist air from enthalpy and humidity ratio. */
function tFromH(h: number, w: number): number {
  return (h - 2501 * w) / (1.006 + 1.86 * w);
}

function regenInlet(i: DesiccantEvalInput): { tC: number; humidityRatio: number } {
  return i.regenAir === 'exhaust'
    ? { tC: EXHAUST_AIR.tC, humidityRatio: EXHAUST_AIR.humidityRatio }
    : { tC: i.ambient.ambientC, humidityRatio: i.ambient.humidityRatio };
}

/** Public helper: regeneration-air RH after heating to regenC (used by the Desikan chart). */
export function regenAirRh(regenC: number, regenAir: DesiccantEvalInput['regenAir'], ambient: ClimatePoint): number {
  const a = regenAir === 'exhaust' ? EXHAUST_AIR : { tC: ambient.ambientC, humidityRatio: ambient.humidityRatio };
  return relativeHumidity(regenC, a.humidityRatio);
}

// ─────────────────────────────────────────────────────────────────────────────
// Main evaluation
// ─────────────────────────────────────────────────────────────────────────────
export function evaluateDesiccant(i: DesiccantEvalInput): DesiccantEvalDetail {
  const e = evaluateCore(i);
  if (!e.operating) return e;
  // Break-even after-cooler/coil COP ratio. net(r) = coilRef − (A/(r·COP_ref) + other) with A = aftercooler
  // duty-electricity × COP_after independent of the COP (moisture removal does not depend on it), so the root of
  // the bisection the spec asks for is exact: r* = A / (COP_ref·(coilRef − other)). Valid in (1, 4], else null.
  const h = e.hvac;
  const copRef = Math.max(1, i.carbon.coilRefCop);
  const copAfter = Math.max(1, i.carbon.aftercoolerCop);
  const other = h.coilRefWe - h.netSavingWe - h.aftercoolerWe;
  const headroom = h.coilRefWe - other;
  const r = headroom > 0 ? (h.aftercoolerWe * copAfter) / (copRef * headroom) : NaN;
  e.breakEvenCopRatio = Number.isFinite(r) && r >= 1 && r <= 4 ? r : null;
  return e;
}

/**
 * Net saving [W_e] and verdict of the same case at several after-cooler/coil COP ratios (coilRefCop fixed).
 * For the UI sensitivity band; independent of whatever default aftercoolerCop the carbon params carry.
 */
export function copRatioSensitivity(
  base: DesiccantEvalInput,
  ratios: number[],
): { ratio: number; netSavingWe: number; verdict: Verdict }[] {
  return ratios.map((ratio) => {
    const e = evaluateCore({
      ...base,
      carbon: { ...base.carbon, aftercoolerCop: ratio * base.carbon.coilRefCop },
    });
    return { ratio, netSavingWe: e.hvac.netSavingWe, verdict: e.verdict };
  });
}

function evaluateCore(i: DesiccantEvalInput): DesiccantEvalDetail {
  const p = i.params;
  if (!p.enabled) return zeroEval(i, ['Jalur desikan dinonaktifkan.']);

  const notes: string[] = [];
  const isComposite = p.material === 'komposit-hipotesis';
  if (isComposite) {
    notes.push(
      'Komposit garam-dalam-matriks: belum ada isoterm tervalidasi. Angka memakai kurva silika-gel RD hanya sebagai acuan, bukan kinerja komposit; putusan dibatasi paling tinggi "marginal".',
    );
  }

  const mP = Math.max(0, p.processAirKgS ?? i.hotel.freshAirKgS); // process air [kg/s dry air]
  const mR = Math.max(1e-6, p.regenAirKgS);
  const tP = i.process.tC;
  const wP = Math.max(0, i.process.humidityRatio);
  const regenC = i.regenC;
  const hIn = enthalpyKJkg(tP, wP);

  // ── Supply target (both routes end here) ──
  const wSupRaw = humidityRatio(i.hotel.supplyDewPointC, 1);
  const wSup = Math.min(wSupRaw, wP);
  const tSup = Math.min(i.hotel.supplyDewPointC + SUPPLY_DB_MARGIN_K, tP);
  const hSup = enthalpyKJkg(tSup, wSup);

  // ── Reference route: one cooling coil at carbon.coilRefCop ──
  const copRef = Math.max(1, i.carbon.coilRefCop);
  const copAfter = Math.max(1, i.carbon.aftercoolerCop);
  const dutyRefKW = Math.max(0, mP * (hIn - hSup));
  const coilRefWe = (dutyRefKW * 1000) / copRef;

  // ── Equilibrium uptakes ──
  const regen = regenInlet(i);
  const rhProcess = relativeHumidity(tP, wP);
  const rhRegen = relativeHumidity(regenC, regen.humidityRatio);
  const qProc = isothermUptake(p.material, rhProcess, tP);
  const qRegen = isothermUptake(p.material, rhRegen, regenC);
  const swing = Math.max(0, qProc - qRegen);
  const eff = Math.min(1, Math.max(0, p.cycleEffectiveness));
  const effSwing = swing * eff;
  const phasesPerH = 60 / Math.max(1e-3, p.cycleMin);

  // ── Bed sensible terms ──
  const qMid = (qProc + qRegen) / 2;
  const hAds = heatOfAdsorptionKJkg(qMid); // kJ/kg water
  const bedCp = p.bedMassKg * (CP_DRY_GEL + CP_WATER * qMid) + p.bedMassKg * BED_METAL_MASS_RATIO * CP_METAL; // kJ/K
  const hv = (t: number) => 2501 + 1.86 * t;

  /**
   * Process-air outlet state for a removal rate M [kg/h]. The air gains the heat of adsorption (which exceeds
   * the latent heat: Δh = Δw·(H_ads − h_v)) plus the sensible heat handed over by the hot, just-regenerated bed.
   */
  const processOutFor = (m: number) => {
    const dw = m / (mP * 3600 || 1);
    const wOut = Math.max(0, wP - dw);
    const carryKJperPhase = BED_CARRYOVER_FRACTION * bedCp * Math.max(0, regenC - tP);
    const carryPerKg = m > 0 ? carryKJperPhase / Math.max(1e-9, mP * p.cycleMin * 60) : 0;
    const hOut = hIn + dw * (hAds - hv(tP)) + carryPerKg;
    return { wOut, tOut: tFromH(hOut, wOut), hOut };
  };

  // ── Moisture limits [kg/h] ──
  const mBed = effSwing * p.bedMassKg * phasesPerH; // 2 beds alternate: one phase swaps one bed's swing
  const mProcessNeed = mP * 3600 * Math.max(0, wP - wSup);
  // Outlet-approach limit: the process air cannot get drier than equilibrium with the regenerated bed, and an
  // adiabatic bed is not at process temperature but warmer (adsorption heat): mean bed temperature = (T_in + T_out)/2.
  const bedMeanC = (m: number) => (tP + processOutFor(m).tOut) / 2;
  const equilibriumWAt = (tBed: number) => humidityRatio(tBed, equilibriumRh(qRegen, tBed));
  const mEquilAt = (m: number) => eff * mP * 3600 * Math.max(0, wP - equilibriumWAt(bedMeanC(m)));

  let M = Math.min(mBed, mProcessNeed);
  let limiter: DesiccantLimiter = M > 0 ? (mBed <= mProcessNeed ? 'bed' : 'process-air') : 'tidak-ada';
  if (M > 0 && M > mEquilAt(M)) {
    let lo = 0;
    let hi = M;
    for (let k = 0; k < 40; k++) {
      const mid = (lo + hi) / 2;
      if (mid <= mEquilAt(mid)) lo = mid;
      else hi = mid;
    }
    M = lo;
    limiter = M > 0 ? 'keseimbangan' : 'tidak-ada';
  }

  /** Regeneration air leaving the bed for a removal rate M [kg/h]. */
  const regenOutFor = (m: number) => {
    const dwR = m / (mR * 3600);
    const wOut = regen.humidityRatio + dwR;
    const tStart = processOutFor(m).tOut; // bed ends its adsorption phase at about the process outlet temperature
    const bedKW = (bedCp * Math.max(0, regenC - tStart) * phasesPerH) / 3600;
    const hHot = enthalpyKJkg(Math.max(regenC, regen.tC), regen.humidityRatio);
    const hOut = hHot - dwR * (hAds - hv(regenC)) - bedKW / mR;
    const tOut = tFromH(hOut, wOut);
    return { wOut, tOut, rh: relativeHumidity(tOut, wOut), bedKW, hHot };
  };
  const regenFeasible = (m: number) => {
    const r = regenOutFor(m);
    return r.tOut >= regen.tC + REGEN_OUT_APPROACH_K && r.rh <= REGEN_OUT_RH_MAX;
  };

  if (M > 0 && !regenFeasible(M)) {
    // The regeneration air cannot carry the heat (desorption + bed reheat) or the water: find the largest M that it can.
    let lo = 0;
    let hi = M;
    if (!regenFeasible(0)) {
      M = 0;
    } else {
      for (let k = 0; k < 40; k++) {
        const mid = (lo + hi) / 2;
        if (regenFeasible(mid)) lo = mid;
        else hi = mid;
      }
      M = lo;
    }
    limiter = M > 0 ? 'udara-regenerasi' : 'tidak-ada';
    notes.push('Udara regenerasi (debit/suhu) membatasi pelepasan air: panas atau kapasitas uapnya habis sebelum bed kering.');
  }

  // Swing ≈ 0 or useless → treat the unit as doing nothing.
  const effectivelyZero = swing < VERDICT.swingMin || M < 1e-6;
  if (effectivelyZero) {
    M = 0;
    limiter = 'tidak-ada';
  }

  // ── Process outlet and regeneration outlet at the final M ──
  const po = processOutFor(M);
  const ro = regenOutFor(M);
  const bedMeanTC = bedMeanC(M);
  const hOutP = enthalpyKJkg(po.tOut, po.wOut);

  // ── Desiccant route electricity ──
  // (1) hot → ambient: pure waste-heat removal on dry air at the high-temperature after-cooler.
  // (2) ambient → T_ac: sensible cooling the DRIED air allows at high evaporating temperature. Credited to the
  //     after-cooler pro rata to how much of the required latent duty the desiccant actually removed (phi), so a
  //     bed that does nothing earns no staging credit; the rest of that duty stays on the reference coil.
  // (3) residual coil at coilRefCop: any moisture/sensible duty left to reach the same supply state.
  const phi = mProcessNeed > 0 ? Math.min(1, M / mProcessNeed) : 0;
  const tAc = Math.min(tP, Math.max(tSup, dewPointC(po.wOut) + 1));
  const hAtAmb = enthalpyKJkg(Math.min(po.tOut, tP), po.wOut);
  const hAtAc = enthalpyKJkg(tAc, po.wOut);
  const dHot = M > 0 ? Math.max(0, mP * (hOutP - hAtAmb)) : 0;
  const dStage = M > 0 ? Math.max(0, mP * (hAtAmb - hAtAc)) : 0;
  const dResid = M > 0 ? Math.max(0, mP * (hAtAc - hSup)) : dutyRefKW;
  const aftercoolerWe = ((dHot + phi * dStage) * 1000) / copAfter;
  const residualWe = ((dResid + (1 - phi) * dStage) * 1000) / copRef;

  // ── Fans on BOTH streams, pump, PV penalty ──
  const fanWe = (((mP + mR) / RHO_AIR) * Math.max(0, p.pressureDropPa)) / Math.max(0.05, p.fanEfficiency);
  const pumpWe = Math.max(0, i.pumpWe ?? 0);
  const pvPenaltyWe = Math.max(0, i.pvPenaltyWe ?? 0);

  // The unit only runs if the bed actually removes water. If not, it simply stays off: no fan penalty is charged
  // (the honest negative is kept for a unit that DOES operate and loses).
  const operating =
    M >= OPERATING_MIN_KGH && swing >= VERDICT.swingMin && (mProcessNeed <= 0 || M >= OPERATING_MIN_COVERAGE * mProcessNeed);
  const desiccantRouteWe = operating ? aftercoolerWe + residualWe + fanWe + pumpWe + pvPenaltyWe : coilRefWe;
  const netSavingWe = operating ? coilRefWe - desiccantRouteWe : 0;

  // ── Regeneration heat: what the heater delivers to the regeneration air ──
  // Desorption heat and bed reheat are taken from this same stream (it leaves the bed cooler), so they are
  // NOT added a second time; what is left over leaves as hot exhaust.
  const cpMoist = 1.006 + 1.86 * regen.humidityRatio;
  const regenHeatW = Math.max(0, mR * cpMoist * (regenC - regen.tC)) * 1000;
  const desorptionW = (hAds * M * 1000) / 3600;
  const bedSensibleW = ro.bedKW * 1000;
  const exhaustLossW = Math.max(0, regenHeatW - desorptionW - bedSensibleW);
  const latentRemovedW = (M * latentHeatKJkg(tP) * 1000) / 3600;
  const thermalCop = regenHeatW > 0 ? latentRemovedW / regenHeatW : 0;

  // ── Per kg of water (same duty, two routes) ──
  const basis = Math.max(M, PER_KG_FLOOR_KGH);
  const perKgWater = {
    desiccantKWhE: desiccantRouteWe / 1000 / basis,
    coilRefKWhE: coilRefWe / 1000 / basis,
  };

  // ── Verdict ──
  let verdict: Verdict;
  if (!operating || netSavingWe <= 0) verdict = 'tidak-layak';
  else if (netSavingWe < VERDICT.marginalShare * coilRefWe || thermalCop < VERDICT.thermalCopMin) verdict = 'marginal';
  else verdict = 'layak';
  if (isComposite && verdict === 'layak') verdict = 'marginal';

  if (!operating) {
    notes.push('Tidak beroperasi pada suhu ini: bed menyerap hampir tidak ada air, sehingga unit tidak dijalankan dan beban tetap pada koil acuan.');
    notes.push(
      swing < VERDICT.swingMin
        ? `Selisih serapan (swing) ≈ 0 pada ${regenC.toFixed(0)} °C: bed tidak kering kembali, desikan tidak menyerap air tambahan.`
        : 'Tidak ada air yang dapat dilepas atau diserap pada kondisi ini.',
    );
  } else if (netSavingWe <= 0) {
    notes.push('Listrik rute desikan (after-cooler, sisa koil, kipas, pompa, penalti PV) tidak lebih kecil daripada koil acuan.');
  }
  notes.push(
    'Putusan memakai neraca listrik bersih; energi panas regenerasi tidak dihitung sebagai biaya listrik di sini dan harus dibandingkan dengan pemakaian panas lain (DHW, PV lebih dingin).',
  );
  if (pvPenaltyWe === 0 && regenC > 40) {
    notes.push('Penalti PV akibat kolektor lebih panas tidak diberikan (0 W); angka bersih ini batas atas.');
  }

  const tag: EvidenceTag = isComposite ? 'hipotesis' : 'simulasi';
  const refIds: RefIdLike[] = isComposite ? [] : [REF_PESARAN_MILLS_1987];

  return {
    operating,
    breakEvenCopRatio: null,
    regenC,
    regenAirRh: rhRegen,
    uptakeProcess: qProc,
    uptakeRegen: qRegen,
    swing,
    effectiveSwing: effSwing,
    moistureRemovedKgH: M,
    processOut: { tC: po.tOut, humidityRatio: po.wOut },
    latentRemovedW,
    regenHeatW,
    thermalCop,
    hvac: operating
      ? { coilRefWe, aftercoolerWe, fanWe, pumpWe, pvPenaltyWe, netSavingWe }
      : { coilRefWe, aftercoolerWe: 0, fanWe: 0, pumpWe: 0, pvPenaltyWe: 0, netSavingWe: 0 },
    perKgWater,
    verdict,
    autonomyH: M > 0 ? (p.bedMassKg * effSwing) / M : 0,
    tag,
    refIds,
    notes,
    limiter,
    bedMeanC: bedMeanTC,
    equilibriumHumidityRatio: equilibriumWAt(bedMeanTC),
    requiredMoistureKgH: mProcessNeed,
    coverage: mProcessNeed > 0 ? M / mProcessNeed : 0,
    regenIn: regen,
    regenOut: { tC: ro.tOut, humidityRatio: ro.wOut, rh: ro.rh },
    regenHeatBreakdownW: { desorption: desorptionW, bedSensible: bedSensibleW, exhaustLoss: exhaustLossW },
    supply: { tC: tSup, humidityRatio: wSup },
    processDeltaTK: po.tOut - tP,
    savedKWhEPerKWhTh: operating && regenHeatW > 0 ? netSavingWe / regenHeatW : 0,
    dutyW: operating
      ? { coilRef: dutyRefKW * 1000, aftercooler: (dHot + phi * dStage) * 1000, residualCoil: (dResid + (1 - phi) * dStage) * 1000 }
      : { coilRef: dutyRefKW * 1000, aftercooler: 0, residualCoil: dutyRefKW * 1000 },
  };
}

/** Evaluate the same case over a list of regeneration temperatures (35…70 °C in the Desikan chart). */
export function desiccantSweep(base: DesiccantEvalInput, regenTemps: number[]): DesiccantEvalDetail[] {
  return regenTemps.map((t) => evaluateDesiccant({ ...base, regenC: t }));
}
