/**
 * The router diagram's data: one `RouterView` assembled from the cached day (useStep), the system inputs and,
 * when the weather engine publishes one, the per-frame `VisualFrame.router` (already smoothed by W5).
 *
 * Nothing here computes physics. The only thing this hook adds is presentation time: when the target state
 * changes (an A/B/C band, a preset click) the numbers glide to it with critically damped springs so that every
 * frame is a state between two real states and the total branch width stays constant (all four valves use the
 * same spring and the same delay, so their sum moves as one). Early keys (sky, temperatures, tank level) start
 * at once; late keys (valves, flows, mode letter) start ~0,35 s later, as the router's actuators do.
 * When animation is off (reduced motion, off-screen) the view snaps to the target.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { springStep, useVisualSelect, type SpringState } from '../../motion';
import type { ControllerMode, DayStep, RegenAirSource, RouterReason, RouterSnapshot, Sink, SystemInputs } from '../../sim/system';
import { useStep, useSystem } from '../../state/systemSelectors';
import { useSystemStore } from '../../state/system';

import { SINK_ORDER } from './layout';
export { SINK_ORDER };

const EARLY = ['soc', 'topC', 'outletC', 'irradiance', 'ambientC', 'rh', 'electricalW', 'potableOutC'] as const;
const LATE = [
  'vBypass', 'vDhw', 'vTank', 'vDesiccant',
  'qLiquidW', 'directW', 'dischargeW', 'backupW', 'demandW',
  'desOn', 'regenW', 'moistureKgH',
  'hpOn', 'hpSourceW', 'hpWorkWe', 'hpCop',
] as const;
const KEYS = [...EARLY, ...LATE] as const;
export type NumKey = (typeof KEYS)[number];
export type Nums = Record<NumKey, number>;
const IS_LATE = KEYS.map((k) => (LATE as readonly string[]).includes(k));

/** Time the late keys wait after the early ones (s). Transition ≈ 0,35 + ~0,8 ≈ 1,15 s. */
const LATE_DELAY_S = 0.35;
/** Spring frequency [rad/s]: 2 % in ≈ 0,9 s. */
const W_SPRING = 6.5;

export interface Discrete {
  mode: ControllerMode;
  pumpOn: boolean;
  reason: RouterReason;
}

export interface RouterView extends Discrete {
  n: Nums;
  regenAir: RegenAirSource;
  supplyDewPointC: number;
  hpEnabled: boolean;
}

export const valueSum = (n: Nums): number => n.vBypass + n.vDhw + n.vTank + n.vDesiccant;

export const valveOf = (n: Nums, s: Sink): number =>
  s === 'dhw' ? n.vDhw : s === 'tank' ? n.vTank : s === 'desiccant' ? n.vDesiccant : n.vBypass;

/** Target state for a step (pure). */
export function targetFromStep(step: DayStep, sys: SystemInputs): RouterView {
  const r = step.router;
  const hp = step.heatPump;
  const n: Nums = {
    soc: step.tank.soc,
    topC: step.tank.topC,
    outletC: step.collector.outletC,
    irradiance: step.climate.irradiance,
    ambientC: step.climate.ambientC,
    rh: step.climate.rh,
    electricalW: step.collector.electricalW,
    potableOutC: step.dhw.potableOutC ?? step.dhw.tankSourceC ?? step.collector.outletC,
    vBypass: r.valves.bypass,
    vDhw: r.valves.dhw,
    vTank: r.valves.tank,
    vDesiccant: r.valves.desiccant,
    qLiquidW: step.collector.qLiquidW,
    directW: step.dhw.fromCollectorW,
    dischargeW: step.dhw.fromTankW,
    backupW: step.dhw.backupW,
    demandW: step.dhw.demandW,
    desOn: step.desiccant.available && step.desiccant.moistureRemovedKgH > 1e-3 ? 1 : 0,
    regenW: step.desiccant.regenW,
    moistureKgH: step.desiccant.moistureRemovedKgH,
    hpOn: hp?.on ? 1 : 0,
    hpSourceW: hp?.sourceW ?? 0,
    hpWorkWe: hp?.workWe ?? 0,
    hpCop: hp?.cop ?? 0,
  };
  return {
    mode: r.mode,
    pumpOn: r.pumpOn,
    reason: r.reason,
    n,
    regenAir: sys.desiccant.regenAir,
    supplyDewPointC: sys.hotel.supplyDewPointC,
    hpEnabled: sys.heatPumpSource.enabled,
  };
}

const toArr = (n: Nums): number[] => KEYS.map((k) => n[k]);
const fromArr = (a: ArrayLike<number>): Nums => {
  const o = {} as Nums;
  KEYS.forEach((k, i) => (o[k] = a[i] as number));
  return o;
};
const sameArr = (a: ArrayLike<number>, b: ArrayLike<number>): boolean => {
  for (let i = 0; i < KEYS.length; i++) if (Math.abs((a[i] as number) - (b[i] as number)) > 1e-9) return false;
  return true;
};

interface Pending {
  at: number;
  g: number[];
  d: Discrete;
}

/** Critically damped follower of `target`. `animate = false` returns the target itself. */
function useGlide(target: RouterView, animate: boolean): RouterView {
  const [shown, setShown] = useState<RouterView>(target);
  const targetRef = useRef(target);
  targetRef.current = target;
  const sim = useRef<{
    x: SpringState[];
    goalEarly: number[];
    goalLate: number[];
    dLate: Discrete;
    queue: Pending[];
    raf: number;
    lastT: number;
  } | null>(null);

  // Keep the static fields (system settings) current without gliding them.
  const statics = { regenAir: target.regenAir, supplyDewPointC: target.supplyDewPointC, hpEnabled: target.hpEnabled };

  useEffect(() => {
    const arr = toArr(target.n);
    const d: Discrete = { mode: target.mode, pumpOn: target.pumpOn, reason: target.reason };
    let s = sim.current;
    if (!s) {
      s = { x: arr.map((v) => ({ x: v, v: 0 })), goalEarly: arr, goalLate: arr, dLate: d, queue: [], raf: 0, lastT: 0 };
      sim.current = s;
    }
    if (!animate) {
      cancelAnimationFrame(s.raf);
      s.raf = 0;
      s.queue = [];
      s.x = arr.map((v) => ({ x: v, v: 0 }));
      s.goalEarly = arr;
      s.goalLate = arr;
      s.dLate = d;
      setShown({ ...target, n: fromArr(arr) });
      return;
    }
    const lastPushed = s.queue.length ? (s.queue[s.queue.length - 1] as Pending) : null;
    const refG = lastPushed ? lastPushed.g : s.goalLate;
    const refD = lastPushed ? lastPushed.d : s.dLate;
    const changed = !sameArr(arr, refG) || refD.mode !== d.mode || refD.pumpOn !== d.pumpOn || refD.reason !== d.reason;
    if (!changed) return;
    s.goalEarly = arr;
    s.queue.push({ at: performance.now() + LATE_DELAY_S * 1000, g: arr, d });
    if (s.raf) return;
    s.lastT = performance.now();
    const tick = (t: number): void => {
      const st = sim.current;
      if (!st) return;
      const dt = Math.min(0.05, Math.max(0.001, (t - st.lastT) / 1000));
      st.lastT = t;
      while (st.queue.length && (st.queue[0] as Pending).at <= t) {
        const p = st.queue.shift() as Pending;
        st.goalLate = p.g;
        st.dLate = p.d;
      }
      let settled = st.queue.length === 0;
      for (let i = 0; i < KEYS.length; i++) {
        const goal = IS_LATE[i] ? (st.goalLate[i] as number) : (st.goalEarly[i] as number);
        const sp = st.x[i] as SpringState;
        springStep(sp, goal, W_SPRING, dt);
        if (Math.abs(sp.x - goal) > 0.002 * Math.max(1, Math.abs(goal)) || Math.abs(sp.v) > 0.02 * Math.max(1, Math.abs(goal))) settled = false;
        else {
          sp.x = goal;
          sp.v = 0;
        }
      }
      const cur = targetRef.current;
      setShown({ ...cur, ...st.dLate, n: fromArr(st.x.map((q) => q.x)) });
      st.raf = settled ? 0 : requestAnimationFrame(tick);
    };
    s.raf = requestAnimationFrame(tick);
  }, [target, animate]);

  useEffect(
    () => () => {
      if (sim.current) cancelAnimationFrame(sim.current.raf);
    },
    [],
  );

  return animate ? { ...shown, ...statics } : target;
}

/** Engine frame router (W5) when present: smooth by construction, so it overrides the glided values. */
const frameRouter = (f: { router?: RouterSnapshot }): RouterSnapshot | null => f.router ?? null;

export interface RouterViewResult {
  /** What the picture draws (glides toward `target`). */
  view: RouterView;
  /** Settled state: use for text readouts and captions. */
  target: RouterView;
  step: DayStep;
}

export function useRouterView(animate: boolean): RouterViewResult {
  const step = useStep();
  const sys = useSystem();
  const target = useMemo(() => targetFromStep(step, sys), [step, sys]);
  const glided = useGlide(target, animate);
  const fr = useVisualSelect(frameRouter, 30);
  const view = useMemo<RouterView>(() => {
    if (!fr || !animate) return glided;
    const q = SINK_ORDER.reduce((s, k) => s + fr.allocW[k], 0);
    return {
      ...glided,
      mode: fr.mode,
      pumpOn: fr.pumpOn,
      reason: fr.reason,
      n: {
        ...glided.n,
        vBypass: fr.valves.bypass,
        vDhw: fr.valves.dhw,
        vTank: fr.valves.tank,
        vDesiccant: fr.valves.desiccant,
        qLiquidW: q,
        directW: fr.allocW.dhw,
        soc: fr.tankSoc,
        topC: fr.tankTopC,
      },
    };
  }, [fr, glided, animate]);
  return { view, target, step };
}

/** Store accessor for the A/B/C preset the user (or a scroll band) chose. */
export const useModeTarget = () => useSystemStore((s) => s.modeTarget);
export const useSetModeTarget = () => useSystemStore((s) => s.setModeTarget);
