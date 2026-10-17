/**
 * v2 visual clock: the same single clock the site is loved for (3D stage, readouts, sky read ONE frame), now
 * following the v2 system store through `SystemTarget`s (see systemTarget.ts and state/systemEngineBinding.ts).
 *
 * Model: a bank of critically damped springs (never overshoot, frame-rate independent, velocity kept on retarget).
 * Every continuous visual quantity is a spring; "scripted" vs "follow" only differ in WHEN each group's goal is
 * applied and with which frequency:
 *
 *  - scripted (mode A/B/C or scenario or strategy change, ~1,1 s): climate group at t = 0, router switch at
 *    0,45 T, valves at 0,4 T (rate limited), collected heat with the climate (a pump START waits for the switch).
 *  - follow (hour scrubbing, system edits): all goals at once, w = 22 (valves w = 9, rate limited).
 *  - snap: reduced motion, hidden tab, first load, `kind: 'snap'`.
 *
 * Every frame is a real computed state: `result = simulate(inputs, 'pvt-liquid')` (about 0,02 ms). The valves
 * are renormalised so that Σ = 1 whenever the pump is on; allocW = valves x collected heat (Σ allocW = Q).
 * No v1 logic (zero crossing / heat reversal): the 'pvt-liquid' collector never rejects heat and the pump is never
 * shown running into a negative q (a command to run with q <= 0 is a stopped pump while the frame is moving).
 *
 * Framework-free (no React, no store, no DOM except optional matchMedia): safe in vitest/node.
 */
import gsap from 'gsap';
import { INPUT_LIMITS, simulate, type NumericInputKey, type SimInputs, type SimResult } from '../sim';
import type { ControllerMode, RouterReason, RouterSnapshot, Sink } from '../sim/system';
import { humidityRatio } from '../sim/system';
import './gsapConfig';
import { clamp, springStep, type SpringState } from './spring';
import { SYSTEM_MOTION as M } from './tokens';
import type { SystemTarget } from './systemTarget';
import type { VisualFrame, FrameListener } from './frame';

export const SINKS: readonly Sink[] = ['dhw', 'tank', 'desiccant', 'bypass'];
const NUMERIC_KEYS = Object.keys(INPUT_LIMITS) as NumericInputKey[];
/** Numeric collector inputs that carry the weather / coupling: they move with the climate group. */
const CLIMATE_KEYS: ReadonlySet<NumericInputKey> = new Set<NumericInputKey>(['irradiance', 'ambientC', 'windMs', 'rainMmH', 'inletC']);

export type ChangeKind = 'scripted' | 'follow' | 'snap';

interface Scalar extends SpringState {
  goal: number;
  w: number;
  eps: number;
  /** max |dx/dt| (0 = none) */
  vmax: number;
  lo: number;
  hi: number;
}

const mk = (x: number, eps: number, lo = -Infinity, hi = Infinity): Scalar => ({ x, v: 0, goal: x, w: M.followW, eps, vmax: 0, lo, hi });

function step(s: Scalar, dt: number): boolean {
  if (s.x === s.goal && s.v === 0) return false;
  const x0 = s.x;
  springStep(s, s.goal, s.w, dt);
  if (s.vmax > 0 && dt > 0) {
    const maxD = s.vmax * dt;
    const d = s.x - x0;
    if (Math.abs(d) > maxD) {
      s.x = x0 + Math.sign(d) * maxD;
      s.v = Math.sign(d) * Math.min(Math.abs(s.v), s.vmax);
    }
  }
  s.x = clamp(s.x, s.lo, s.hi);
  if (Math.abs(s.x - s.goal) < s.eps && Math.abs(s.v) < s.eps * 4) {
    s.x = s.goal;
    s.v = 0;
    return false;
  }
  return true;
}

function aim(s: Scalar, goal: number, w: number, vmax = 0): void {
  s.goal = goal;
  s.w = w;
  s.vmax = vmax;
}

function jump(s: Scalar, goal: number): void {
  s.x = goal;
  s.goal = goal;
  s.v = 0;
}

export interface SystemEngineOptions {
  reducedMotion?: () => boolean;
  hidden?: () => boolean;
  now?: () => number;
  /** false in tests: the engine is driven with tick() only. */
  autoTick?: boolean;
}

export interface SystemEngine {
  frame(): VisualFrame;
  /** hz = 0: every step (3D). hz > 0: at most hz per second, plus one guaranteed flush when motion ends (text). */
  subscribe(cb: FrameListener, hz?: number): () => void;
  /** Called by the store binding with the authoritative target. `follow` is the default. */
  setTarget(t: SystemTarget, opts?: { kind?: ChangeKind }): void;
  /** Advance by dt seconds (the GSAP ticker calls this while moving). */
  tick(dt: number): void;
  /** Jump to the current target. */
  snap(): void;
  target(): SystemTarget;
  /** A scripted transition is in progress (its pending router / valve switches included). */
  scripted(): boolean;
  dispose(): void;
}

const prefersReduced = (): boolean =>
  typeof window !== 'undefined' && typeof window.matchMedia === 'function'
    ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
    : false;
const docHidden = (): boolean => typeof document !== 'undefined' && document.hidden === true;

const collectedW = (t: SystemTarget): number => (t.router.pumpOn ? SINKS.reduce((s, k) => s + t.router.allocW[k], 0) : 0);

export function createSystemEngine(initial: SystemTarget, opts: SystemEngineOptions = {}): SystemEngine {
  const reduced = opts.reducedMotion ?? prefersReduced;
  const hidden = opts.hidden ?? docHidden;
  const now = opts.now ?? (() => (typeof performance !== 'undefined' ? performance.now() : Date.now()));
  const autoTick = opts.autoTick ?? true;

  let tgt = initial;
  // ── spring bank ──
  const mod = {} as Record<NumericInputKey, Scalar>;
  for (const k of NUMERIC_KEYS) {
    const lim = INPUT_LIMITS[k];
    mod[k] = mk(initial.inputs[k], (lim.max - lim.min) * 5e-4, lim.min, lim.max);
  }
  const rh = mk(initial.climate.rh, 5e-4, 0, 1);
  const hour = mk(initial.hour, 0.005, 0, 72);
  const tankSoc = mk(initial.router.tankSoc, 5e-4, 0, 1);
  const tankTopC = mk(initial.router.tankTopC, 0.01);
  const heatW = mk(collectedW(initial), 2, 0);
  const dist = SINKS.map((k) => mk(initial.router.pumpOn ? initial.router.valves[k] : k === 'dhw' ? 1 : 0, 2e-3, 0, 1));
  const open = mk(initial.router.pumpOn ? 1 : 0, 5e-3, 0, 1);
  const all: Scalar[] = [...NUMERIC_KEYS.map((k) => mod[k]), rh, hour, tankSoc, tankTopC, heatW, ...dist, open];

  // ── discrete visual state ──
  let pumpOn = initial.router.pumpOn;
  let rMode: ControllerMode = initial.router.mode;
  let rReason: RouterReason = initial.router.reason;

  // ── script ──
  let clock = 0;
  let isScripted = false;
  interface Pending {
    at: number;
    kind: 'router' | 'valves';
  }
  let pending: Pending[] = [];

  let ticking = false;
  let moving = false;
  const subs = new Set<{ cb: FrameListener; minGapMs: number; last: number }>();
  const f: VisualFrame = {
    inputs: initial.inputs,
    result: simulate(initial.inputs, 'pvt-liquid'),
    progress: 1,
    moving: false,
    epoch: 0,
  };

  const emit = (flush: boolean): void => {
    const t = now();
    for (const s of subs) {
      if (flush || t - s.last >= s.minGapMs) {
        s.last = t;
        s.cb(f);
      }
    }
  };

  const normDist = (): number[] => {
    let sum = 0;
    for (const d of dist) sum += d.x;
    if (sum < 1e-9) return SINKS.map((k) => (tgt.router.pumpOn ? tgt.router.valves[k] : k === 'dhw' ? 1 : 0));
    return dist.map((d) => d.x / sum);
  };

  function buildInputs(idle: boolean): SimInputs {
    const out: SimInputs = { ...tgt.inputs };
    for (const k of NUMERIC_KEYS) out[k] = mod[k].x;
    out.humidityRatio = idle ? tgt.climate.humidityRatio : humidityRatio(out.ambientC, rh.x);
    out.pumpControl = pumpOn ? 'on' : 'off';
    return out;
  }

  function publish(isMoving: boolean): void {
    moving = isMoving;
    const inputs = buildInputs(!isMoving);
    let result: SimResult = simulate(inputs, 'pvt-liquid');
    // A running pump never shows heat flowing from the loop to the panel while a transition is in flight.
    if (isMoving && pumpOn && result.qLiquidW <= 0) {
      inputs.pumpControl = 'off';
      result = simulate(inputs, 'pvt-liquid');
    }
    // Heat to the sinks never exceeds what the visual collector actually delivers (array = modules x module q):
    // when the sky closes the heat falls with the computed q, not with a script.
    const q = isMoving ? Math.min(heatW.x, tgt.modules * Math.max(0, result.qLiquidW)) : heatW.x;
    const nd = normDist();
    const valves = {} as Record<Sink, number>;
    const allocW = {} as Record<Sink, number>;
    SINKS.forEach((k, i) => {
      valves[k] = pumpOn ? (nd[i] as number) : (nd[i] as number) * open.x;
      allocW[k] = pumpOn ? (nd[i] as number) * q : 0;
    });
    const router: RouterSnapshot = { mode: rMode, pumpOn, valves, allocW, tankSoc: tankSoc.x, tankTopC: tankTopC.x, reason: rReason };
    f.inputs = inputs;
    f.result = result;
    f.router = router;
    f.climate = {
      irradiance: inputs.irradiance,
      ambientC: inputs.ambientC,
      rh: rh.x,
      humidityRatio: inputs.humidityRatio ?? 0,
      windMs: inputs.windMs,
      rainMmH: inputs.rainMmH,
    };
    f.hour = hour.x;
    f.hourOfDay = ((hour.x % 24) + 24) % 24;
    f.progress = isScripted ? Math.min(1, clock / M.transition) : 1;
    f.moving = isMoving;
    f.epoch++;
    emit(!isMoving);
  }

  const tickerFn = (_time: number, deltaMs: number): void => tick(Math.min(deltaMs, 50) / 1000);
  const startTicker = (): void => {
    if (autoTick && !ticking) {
      ticking = true;
      gsap.ticker.add(tickerFn);
    }
  };
  const stopTicker = (): void => {
    if (ticking) {
      ticking = false;
      gsap.ticker.remove(tickerFn);
    }
  };

  // ── goals ──
  function aimClimate(t: SystemTarget, w: number): void {
    heatW.eps = Math.max(2, 1e-3 * Math.max(collectedW(t), heatW.x, collectedW(tgt)));
    for (const k of NUMERIC_KEYS) aim(mod[k], t.inputs[k], CLIMATE_KEYS.has(k) ? w : M.followW);
    aim(rh, t.climate.rh, w);
    aim(hour, t.hour, w);
    aim(tankSoc, t.router.tankSoc, w);
    aim(tankTopC, t.router.tankTopC, w);
  }
  function aimValves(t: SystemTarget, w: number): void {
    if (!t.router.pumpOn) return; // closed valves hold their last distribution while the pump is off
    let sum = 0;
    for (const k of SINKS) sum += t.router.valves[k];
    if (sum < 1e-9) return;
    SINKS.forEach((k, i) => aim(dist[i] as Scalar, t.router.valves[k] / sum, w, M.valveVmax));
  }
  function applyRouter(t: SystemTarget, w: number): void {
    pumpOn = t.router.pumpOn;
    rMode = t.router.mode;
    rReason = t.router.reason;
    aim(open, pumpOn ? 1 : 0, M.openW);
    aim(heatW, collectedW(t), w);
  }

  function snap(): void {
    for (const k of NUMERIC_KEYS) jump(mod[k], tgt.inputs[k]);
    jump(rh, tgt.climate.rh);
    jump(hour, tgt.hour);
    jump(tankSoc, tgt.router.tankSoc);
    jump(tankTopC, tgt.router.tankTopC);
    jump(heatW, collectedW(tgt));
    if (tgt.router.pumpOn) {
      let sum = 0;
      for (const k of SINKS) sum += tgt.router.valves[k];
      SINKS.forEach((k, i) => jump(dist[i] as Scalar, sum > 1e-9 ? tgt.router.valves[k] / sum : k === 'dhw' ? 1 : 0));
    }
    jump(open, tgt.router.pumpOn ? 1 : 0);
    pumpOn = tgt.router.pumpOn;
    rMode = tgt.router.mode;
    rReason = tgt.router.reason;
    pending = [];
    isScripted = false;
    clock = 0;
    stopTicker();
    publish(false);
  }

  function tick(dt: number): void {
    if (!moving && pending.length === 0) return;
    clock += dt;
    if (pending.length > 0) {
      const due = pending.filter((p) => clock >= p.at);
      if (due.length > 0) {
        pending = pending.filter((p) => clock < p.at);
        for (const p of due) {
          if (p.kind === 'router') applyRouter(tgt, M.climateW);
          else aimValves(tgt, M.valveW);
        }
      }
    }
    let any = pending.length > 0;
    for (const s of all) if (step(s, dt)) any = true;
    // Σ valves = 1 is preserved by the linear springs; rate limiting / clamping can disturb it by a hair.
    let sum = 0;
    for (const d of dist) sum += d.x;
    if (sum > 1e-9 && Math.abs(sum - 1) > 1e-12) for (const d of dist) d.x /= sum;
    if (!any) {
      isScripted = false;
      stopTicker();
      publish(false);
      clock = 0;
    } else {
      publish(true);
    }
  }

  function setTarget(t: SystemTarget, o?: { kind?: ChangeKind }): void {
    const prev = tgt;
    tgt = t;
    if (t === prev) return;
    const kind = o?.kind ?? 'follow';
    if (kind === 'snap' || reduced() || hidden()) {
      snap();
      return;
    }
    if (kind === 'scripted') {
      // Restart the script from the CURRENT visual state (positions and velocities are kept).
      clock = 0;
      isScripted = true;
      aimClimate(t, M.climateW);
      const starting = t.router.pumpOn && !pumpOn;
      // heat: rises with the pump start (after the switch), falls with the climate
      if (!starting) aim(heatW, collectedW(t), M.climateW);
      pending = [
        { at: M.switchAt * M.transition, kind: 'router' },
        { at: M.valveFrom * M.transition, kind: 'valves' },
      ];
    } else {
      clock = 0;
      isScripted = false;
      pending = [];
      aimClimate(t, M.followW);
      applyRouter(t, M.followW);
      aimValves(t, M.followValveW);
    }
    if (pending.length === 0 && !all.some((s) => s.x !== s.goal || s.v !== 0)) {
      stopTicker();
      isScripted = false;
      publish(false);
      return;
    }
    startTicker();
    publish(true);
  }

  publish(false);
  f.epoch = 0;

  return {
    frame: () => f,
    subscribe(cb, hz = 0) {
      const s = { cb, minGapMs: hz > 0 ? 1000 / hz : 0, last: -Infinity };
      subs.add(s);
      return () => {
        subs.delete(s);
      };
    },
    setTarget,
    tick,
    snap,
    target: () => tgt,
    scripted: () => isScripted,
    dispose() {
      stopTicker();
      subs.clear();
    },
  };
}
