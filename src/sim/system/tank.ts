/**
 * Two-node (top / bottom) stratified buffer tank on a CLOSED collector/buffer loop (W2a).
 *
 * Why closed: potable water must never sit at 25-45 °C (Legionella growth range). The tank therefore holds
 * loop fluid (water or glycol-water), NOT potable water. Collector heat enters through the charge coil/HX,
 * and the DHW preheat is an EXTERNAL plate HX fed from the top node only while a draw is running
 * (see dhw.ts). Potable volume in contact with the heat stays tiny, and the existing heater (≥ 60 °C) finishes it.
 *
 * Model
 *  - Two equal-volume, fully mixed nodes. Heat capacity per node C = ρ·cp·V/2.
 *  - Charge (heat from the collector loop, power chargeW at fluid temperature chargeC):
 *      goes to the TOP node when chargeC is hotter than the top node, otherwise to the BOTTOM node; once the
 *      preferred node reaches min(chargeC, maxC) the remainder goes to the other node. A node can never be
 *      heated above chargeC (second law) or above maxC. Heat that cannot be accepted is REPORTED as
 *      rejectedChargeW so the router can bypass.
 *  - Discharge (heat to the DHW preheat HX, power dischargeW): fluid leaves the TOP node, returns to the
 *      BOTTOM node at T_mains + RETURN_APPROACH_K (the loop-side flow is modulated so that the loop leaves the
 *      HX near the mains temperature plus an approach; asumsi). In the two-node advection form the top gets the
 *      bottom's water and the bottom gets the return water, which is exactly energy-conserving.
 *  - Losses: UA is split 50/50 between nodes (equal surface), each against ambientC.
 *  - Weak inter-node mixing conductance (wall conduction + port mixing; asumsi) and instant buoyancy mixing
 *      if the bottom ever gets hotter than the top.
 *  - Integration: explicit in 1-minute sub-steps (all rates are slow vs 1 min, the advection fraction per
 *      sub-step is capped), so it is stable for dtH up to 0.25 h and beyond, and the first law closes exactly.
 *
 * Evidence: mapan (lumped energy balance); geometry, U-value, approach and mixing are asumsi.
 */
import type { TankParams, TankState } from './contract';
import { WATER_CP_J_PER_KG_K, WATER_RHO_KG_PER_L } from './dhw';

/** Return temperature above mains for the loop leaving the DHW HX [K] (asumsi). */
export const RETURN_APPROACH_K = 4;
/** Cylinder height / diameter (asumsi). */
export const TANK_ASPECT = 1.5;
/** Inter-node mixing multiplier on pure water conduction (wall + ports; asumsi). */
const MIXING_FACTOR = 5;
const WATER_CONDUCTIVITY = 0.62; // W/(m·K)
const SUBSTEP_H = 1 / 60;
const MAX_FLOW_FRACTION = 0.25; // of one node's content per sub-step

export interface TankFlows {
  /** Heat the collector loop wants to put in [W_th]. */
  chargeW: number;
  /** Temperature of the charging fluid [°C]. */
  chargeC: number;
  /** Heat the DHW preheat HX wants to take [W_th]. */
  dischargeW: number;
  mainsC: number;
  ambientC: number;
}

export interface TankStepResult {
  state: TankState;
  /** Mean over the step [W_th]. */
  acceptedChargeW: number;
  /** chargeW − accepted: tank full or charge fluid not hotter than the nodes [W_th]. */
  rejectedChargeW: number;
  deliveredDischargeW: number;
  /** requested − delivered discharge (top node too cold / exhausted) [W_th]; the heater covers it. */
  shortfallDischargeW: number;
  lossW: number;
}

/** Cylinder dimensions for a volume [L] at TANK_ASPECT: diameter, height, outer surface area (incl. both caps). */
export function tankGeometry(volumeL: number): { diameterM: number; heightM: number; surfaceM2: number } {
  const v = Math.max(volumeL, 1) / 1000;
  const d = Math.cbrt((4 * v) / (Math.PI * TANK_ASPECT));
  const h = TANK_ASPECT * d;
  return { diameterM: d, heightM: h, surfaceM2: Math.PI * d * h + (Math.PI * d * d) / 2 };
}

/** Overall loss coefficient UA [W/K] of an insulated cylinder with surface U-value [W/(m²·K)]. */
export function tankUaWPerK(volumeL: number, uWPerM2K: number): number {
  return tankGeometry(volumeL).surfaceM2 * uWPerM2K;
}

/** Heat capacity of one node [J/K]. */
function nodeCapacityJPerK(p: TankParams): number {
  return (WATER_RHO_KG_PER_L * p.volumeL * WATER_CP_J_PER_KG_K) / 2;
}

/** Inter-node mixing conductance [W/K]. */
function mixConductanceWPerK(p: TankParams): number {
  const g = tankGeometry(p.volumeL);
  const area = (Math.PI * g.diameterM * g.diameterM) / 4;
  return (MIXING_FACTOR * WATER_CONDUCTIVITY * area) / (g.heightM / 2);
}

function socOf(topC: number, bottomC: number, p: TankParams, mainsC: number): number {
  const span = Math.max(p.maxC - mainsC, 1e-9);
  const mean = (topC + bottomC) / 2;
  return Math.min(Math.max((mean - mainsC) / span, 0), 1);
}

/** Sensible heat stored relative to a reference temperature [kWh_th] (use mainsC for usable heat). */
export function tankEnergyKWhTh(s: Pick<TankState, 'topC' | 'bottomC'>, p: TankParams, refC: number): number {
  return (nodeCapacityJPerK(p) * (s.topC - refC + (s.bottomC - refC))) / 3.6e6;
}

/** Heat the tank could still take over dtH before the nodes hit maxC [W_th] (router bypass check). */
export function tankHeadroomW(s: TankState, p: TankParams, dtH: number, chargeC?: number): number {
  const lim = chargeC === undefined ? p.maxC : Math.min(chargeC, p.maxC);
  const c = nodeCapacityJPerK(p);
  const room = c * (Math.max(lim - s.topC, 0) + Math.max(lim - s.bottomC, 0));
  return room / Math.max(dtH * 3600, 1e-9);
}

/** Initial tank state (loss shown against mains as the ambient proxy). Clamped to [mainsC, maxC]. */
export function initialTank(p: TankParams, mainsC: number): TankState {
  const clamp = (x: number) => Math.min(Math.max(x, mainsC), p.maxC);
  const topC = clamp(p.initialTopC);
  const bottomC = Math.min(clamp(p.initialBottomC), topC);
  const lossW = (p.uaWPerK / 2) * (topC - mainsC + (bottomC - mainsC));
  return { topC, bottomC, soc: socOf(topC, bottomC, p, mainsC), lossW };
}

/** Full step with accounting of what was accepted / delivered (use this for first-law checks). */
export function stepTankDetailed(s: TankState, p: TankParams, f: TankFlows, dtH: number): TankStepResult {
  const total = Math.max(dtH, 0);
  if (total === 0) {
    return { state: s, acceptedChargeW: 0, rejectedChargeW: 0, deliveredDischargeW: 0, shortfallDischargeW: 0, lossW: s.lossW };
  }
  const n = Math.max(1, Math.ceil(total / SUBSTEP_H));
  const hs = (total / n) * 3600; // seconds per sub-step
  const c = nodeCapacityJPerK(p);
  const kMix = mixConductanceWPerK(p);
  const uaNode = p.uaWPerK / 2;
  const tRet = f.mainsC + RETURN_APPROACH_K;
  const tSrc = Math.min(f.chargeC, p.maxC);
  const chargeReqJ = Math.max(f.chargeW, 0) * hs;
  const dischargeReqJ = Math.max(f.dischargeW, 0) * hs;

  let top = s.topC;
  let bot = s.bottomC;
  let accJ = 0;
  let delJ = 0;
  let lossJ = 0;

  for (let i = 0; i < n; i++) {
    // 1. charge: preferred node first, remainder to the other
    if (chargeReqJ > 0 && tSrc > Math.min(top, bot)) {
      let left = chargeReqJ;
      const topFirst = f.chargeC > top;
      for (const node of topFirst ? (['top', 'bot'] as const) : (['bot', 'top'] as const)) {
        const t = node === 'top' ? top : bot;
        const take = Math.min(left, c * Math.max(tSrc - t, 0));
        if (node === 'top') top += take / c;
        else bot += take / c;
        left -= take;
        accJ += take;
      }
    }
    // 2. discharge (advection: top -> HX -> bottom)
    if (dischargeReqJ > 0) {
      const dT = top - tRet;
      if (dT > 0.5) {
        const x = Math.min(dischargeReqJ / (c * dT), MAX_FLOW_FRACTION);
        const t0 = top;
        const b0 = bot;
        top = t0 + x * (b0 - t0);
        bot = b0 + x * (tRet - b0);
        delJ += x * c * dT;
      }
    }
    // 3. inter-node mixing + losses (explicit; rates are slow vs 1 min)
    const mix = kMix * (top - bot) * hs;
    const lossTop = uaNode * (top - f.ambientC) * hs;
    const lossBot = uaNode * (bot - f.ambientC) * hs;
    top += (-mix - lossTop) / c;
    bot += (mix - lossBot) / c;
    lossJ += lossTop + lossBot;
    // 4. buoyancy: a hotter bottom rises and mixes
    if (bot > top) {
      const m = (top + bot) / 2;
      top = m;
      bot = m;
    }
  }

  const sec = total * 3600;
  const lossW = lossJ / sec;
  const acceptedChargeW = accJ / sec;
  const deliveredDischargeW = delJ / sec;
  return {
    state: { topC: top, bottomC: bot, soc: socOf(top, bot, p, f.mainsC), lossW },
    acceptedChargeW,
    rejectedChargeW: Math.max(f.chargeW, 0) - acceptedChargeW,
    deliveredDischargeW,
    shortfallDischargeW: Math.max(f.dischargeW, 0) - deliveredDischargeW,
    lossW,
  };
}

/** Contract signature: advance the tank by dtH [h]. */
export function stepTank(s: TankState, p: TankParams, f: TankFlows, dtH: number): TankState {
  return stepTankDetailed(s, p, f, dtH).state;
}
