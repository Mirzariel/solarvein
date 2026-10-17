/**
 * Weather engine: the single visual clock of SolarVein.
 *
 * The store keeps the authoritative TARGET inputs (instant, unchanged). This engine owns the VISUAL inputs
 * and `result = simulate(visualInputs)` (about 0.02 ms per call, so it runs on every animation step): every
 * frame the 3D effects, readouts and statement see is a real computed state.
 *
 *  - Scripted transition (a preset switch / "reset to preset": >= 3 numeric inputs changed, or a transition is
 *    already running): a GSAP timeline drives progress p 0..1 over 0.6-1.2 s; each input moves inside its own
 *    window (staggered, smootherstep, monotone, never overshoots). Retargeting mid-flight restarts from the
 *    CURRENT visual inputs, so rapid switching is continuous and reversible.
 *  - Pump hold: when the pump runs at both endpoints it is forced ON for the intermediate states (the controller
 *    dead band would otherwise stop it and spike the cell temperature); the two valuation flags switch at p*, the
 *    computed zero crossing of q_liquid. At p = 1 the true target inputs are written.
 *  - Follow (slider drags, Lab edits): each numeric input chases the target with a critically damped spring.
 *  - Reduced motion / hidden tab: snap to the target.
 *
 * Framework-free (no React, no DOM except optional matchMedia), safe in vitest/node.
 */
import gsap from 'gsap';
import type { ClimatePoint, RouterSnapshot } from '../sim/system';
import './gsapConfig';
import { INPUT_LIMITS, simulate, type NumericInputKey, type SimInputs, type SimResult } from '../sim';
import { clamp, clamp01, lerp, smootherstep, springStep, type SpringState } from './spring';
import { BRIGHTEN_WINDOWS, DARKEN_WINDOWS, DEFAULT_WINDOW, DUR, SPRING_W, type WindowMap } from './tokens';

export interface VisualFrame {
  /** Visual inputs of this frame (what the sim was run with). */
  inputs: SimInputs;
  /** simulate(inputs): always a real computed state. */
  result: SimResult;
  /** Scripted transition progress 0..1 (1 when idle). */
  progress: number;
  /** A transition or a follow spring is running. */
  moving: boolean;
  /** Increments on every change; consumers redraw when it differs from what they last drew. */
  epoch: number;
  /**
   * v2: router state at the current scenario time (valves/alloc interpolated toward the target with actuator
   * dynamics; read from the cached DayResult, never integrated per frame). Absent on v1 frames.
   */
  router?: RouterSnapshot;
  /** v2: climate at the current scenario time (sky, humidity). */
  climate?: ClimatePoint;
  /** v2: scenario hour of this frame (0..24, or 0..72 on the 3-day scenario; continuous, follows the clock sweep). */
  hour?: number;
  /** v2: hour of day 0..24 of this frame (hour mod 24). */
  hourOfDay?: number;
}

export type FrameListener = (f: VisualFrame) => void;

const NUMERIC_KEYS = Object.keys(INPUT_LIMITS) as NumericInputKey[];

export interface Plan {
  from: SimInputs;
  to: SimInputs;
  dir: 'darken' | 'brighten';
  duration: number;
  windows: WindowMap;
  /** Pump forced ON in the intermediate states (pump runs at both endpoints). */
  hold: boolean;
  /** Progress where the valuation flags (and, without hold, the pump command) switch: the q zero crossing. */
  pStar: number;
}

/** Number of numeric inputs that differ. */
export function changedKeys(a: SimInputs, b: SimInputs): number {
  let n = 0;
  for (const k of NUMERIC_KEYS) if (a[k] !== b[k]) n++;
  return n;
}

function differs(a: SimInputs, b: SimInputs): boolean {
  return (
    changedKeys(a, b) > 0 ||
    a.pumpControl !== b.pumpControl ||
    a.heatLoadAvailable !== b.heatLoadAvailable ||
    a.hotSourceAvailable !== b.hotSourceAvailable
  );
}

/** Inputs at progress p of a plan. Numeric inputs: staggered smootherstep windows (monotone between endpoints). */
export function inputsAt(plan: Plan, p: number): SimInputs {
  if (p >= 1) return plan.to;
  const { from, to } = plan;
  const out: SimInputs = { ...from };
  for (const k of NUMERIC_KEYS) {
    const a = from[k];
    const b = to[k];
    if (a === b) continue;
    const [w0, w1] = plan.windows[k] ?? DEFAULT_WINDOW;
    out[k] = lerp(a, b, smootherstep((p - w0) / (w1 - w0)));
  }
  const late = p >= plan.pStar;
  out.heatLoadAvailable = late ? to.heatLoadAvailable : from.heatLoadAvailable;
  out.hotSourceAvailable = late ? to.hotSourceAvailable : from.hotSourceAvailable;
  out.pumpControl = plan.hold ? 'on' : p >= 0.5 ? to.pumpControl : from.pumpControl;
  return out;
}

/** q_liquid at progress p with the pump held on (flags do not affect q when the pump is forced). */
function qAt(plan: Plan, p: number): number {
  const i = inputsAt({ ...plan, hold: true, pStar: 0 }, Math.min(p, 0.999999));
  return simulate({ ...i, pumpControl: 'on' }).qLiquidW;
}

/** Zero crossing of q_liquid along the plan (scan + bisection, ~50 sims). 0.5 when q never changes sign. */
export function findZeroCrossing(plan: Plan): number {
  const N = 24;
  const q0 = qAt(plan, 0);
  let prevP = 0;
  for (let i = 1; i <= N; i++) {
    const p = i / N;
    const q = i === N ? simulate({ ...plan.to, pumpControl: 'on' }).qLiquidW : qAt(plan, p);
    if (q0 !== 0 && Math.sign(q) !== Math.sign(q0)) {
      let lo = prevP;
      let hi = p;
      for (let n = 0; n < 14; n++) {
        const mid = 0.5 * (lo + hi);
        if (Math.sign(qAt(plan, mid)) === Math.sign(q0)) lo = mid;
        else hi = mid;
      }
      return 0.5 * (lo + hi);
    }
    prevP = p;
  }
  return 0.5;
}

/** Perceptual size of a transition 0..1 (Cerah <-> Hujan = 1). */
export function transitionDistance(a: SimInputs, b: SimInputs): number {
  return clamp01(
    Math.max(
      Math.abs(a.irradiance - b.irradiance) / 700,
      Math.abs(a.rainMmH - b.rainMmH) / 12,
      Math.abs(a.ambientC - b.ambientC) / 7,
      Math.abs(a.inletC - b.inletC) / 10,
      Math.abs(a.windMs - b.windMs) / 3,
      Math.abs(a.flowLpm - b.flowLpm) / 2,
    ),
  );
}

export function planTransition(from: SimInputs, to: SimInputs): Plan {
  const darken = to.irradiance !== from.irradiance ? to.irradiance < from.irradiance : to.rainMmH >= from.rainMmH;
  const dist = transitionDistance(from, to);
  const plan: Plan = {
    from,
    to,
    dir: darken ? 'darken' : 'brighten',
    duration: clamp(DUR.weatherMin + (DUR.weatherMax - DUR.weatherMin) * dist, DUR.weatherMin, DUR.weatherMax),
    windows: darken ? DARKEN_WINDOWS : BRIGHTEN_WINDOWS,
    hold: simulate(from).pumpOn && simulate(to).pumpOn,
    pStar: 0.5,
  };
  plan.pStar = plan.hold ? findZeroCrossing(plan) : 0.5;
  return plan;
}

// ── engine ─────────────────────────────────────────────────────────────────────────────────────
interface Sub {
  cb: FrameListener;
  minGapMs: number;
  last: number;
}

export interface EngineOptions {
  reducedMotion?: () => boolean;
  hidden?: () => boolean;
  now?: () => number;
  /** false in tests: the engine is driven with tick() only (scripted progress still uses GSAP + seek()). */
  autoTick?: boolean;
}

export interface WeatherEngine {
  frame(): VisualFrame;
  /** hz = 0: every step (3D). hz > 0: at most hz per second, plus one guaranteed flush when motion ends (text). */
  subscribe(cb: FrameListener, hz?: number): () => void;
  /** Called by the store binding with the new authoritative inputs. */
  setTarget(inputs: SimInputs, opts?: { instant?: boolean }): void;
  /** Evidence/tests: freeze the running scripted transition at progress p. */
  seek(p: number): void;
  /** Advance follow springs by dt seconds. */
  tick(dt: number): void;
  plan(): Plan | null;
  target(): SimInputs;
  snap(): void;
  dispose(): void;
}

const prefersReduced = (): boolean =>
  typeof window !== 'undefined' && typeof window.matchMedia === 'function'
    ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
    : false;
const docHidden = (): boolean => typeof document !== 'undefined' && document.hidden === true;

export function createWeatherEngine(initial: SimInputs, opts: EngineOptions = {}): WeatherEngine {
  const reduced = opts.reducedMotion ?? prefersReduced;
  const hidden = opts.hidden ?? docHidden;
  const now = opts.now ?? (() => (typeof performance !== 'undefined' ? performance.now() : Date.now()));
  const autoTick = opts.autoTick ?? true;

  let target = initial;
  const springs = new Map<NumericInputKey, SpringState>();
  let vis: SimInputs = initial;
  let activePlan: Plan | null = null;
  let tl: gsap.core.Timeline | null = null;
  const prog = { p: 0 };
  let ticking = false;
  const subs = new Set<Sub>();

  const f: VisualFrame = { inputs: initial, result: simulate(initial), progress: 1, moving: false, epoch: 0 };

  const emit = (flush: boolean): void => {
    const t = now();
    for (const s of subs) {
      if (flush || t - s.last >= s.minGapMs) {
        s.last = t;
        s.cb(f);
      }
    }
  };

  const publish = (inputs: SimInputs, progress: number, moving: boolean): void => {
    vis = inputs;
    f.inputs = inputs;
    f.result = simulate(inputs);
    f.progress = progress;
    f.moving = moving;
    f.epoch++;
    emit(!moving);
  };

  const tickerFn = (_time: number, deltaMs: number): void => tick(Math.min(deltaMs, 100) / 1000);
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

  const killPlan = (): void => {
    tl?.kill();
    tl = null;
    activePlan = null;
  };

  function snap(): void {
    killPlan();
    springs.clear();
    stopTicker();
    publish(target, 1, false);
  }

  function startScripted(from: SimInputs, to: SimInputs): void {
    killPlan();
    springs.clear();
    stopTicker();
    const plan = planTransition(from, to);
    activePlan = plan;
    prog.p = 0;
    const t = gsap.timeline({
      paused: !autoTick,
      onUpdate: () => {
        if (activePlan === plan) publish(inputsAt(plan, prog.p), prog.p, true);
      },
      onComplete: () => {
        if (activePlan === plan) {
          activePlan = null;
          tl = null;
          publish(plan.to, 1, false);
        }
      },
    });
    t.addLabel('flip', plan.pStar * plan.duration);
    t.to(prog, { p: 1, duration: plan.duration, ease: 'none' }, 0);
    tl = t;
    publish(inputsAt(plan, 0), 0, true);
  }

  function tick(dt: number): void {
    if (activePlan || springs.size === 0) return; // GSAP owns scripted progress
    const out: SimInputs = { ...target, pumpControl: vis.pumpControl };
    let moving = false;
    for (const k of NUMERIC_KEYS) {
      const s = springs.get(k);
      if (!s) continue;
      const lim = INPUT_LIMITS[k];
      const goal = target[k];
      springStep(s, goal, SPRING_W.follow, dt);
      const eps = (lim.max - lim.min) * 0.0005;
      if (Math.abs(s.x - goal) < eps && Math.abs(s.v) < eps * 4) {
        springs.delete(k);
        out[k] = goal;
      } else {
        s.x = clamp(s.x, lim.min, lim.max);
        out[k] = s.x;
        moving = true;
      }
    }
    for (const k of NUMERIC_KEYS) if (!springs.has(k)) out[k] = target[k];
    if (!moving) {
      springs.clear();
      stopTicker();
      publish(target, 1, false);
    } else {
      publish(out, 1, true);
    }
  }

  function setTarget(next: SimInputs, o?: { instant?: boolean }): void {
    const prev = target;
    target = next;
    if (next === prev) return;
    if (o?.instant || reduced() || hidden()) {
      snap();
      return;
    }
    const keys = changedKeys(vis, next);
    if (!activePlan && !differs(vis, next)) {
      snap();
      return;
    }
    // Presets (>= 3 keys) and anything arriving during a scripted transition are scripted.
    if (activePlan || keys >= 3) {
      startScripted(vis, next);
      return;
    }
    // Follow: numeric inputs spring toward the target, discrete inputs switch at once.
    for (const k of NUMERIC_KEYS) {
      if (vis[k] !== next[k] && !springs.has(k)) springs.set(k, { x: vis[k], v: 0 });
    }
    vis = {
      ...vis,
      pumpControl: next.pumpControl,
      heatLoadAvailable: next.heatLoadAvailable,
      hotSourceAvailable: next.hotSourceAvailable,
    };
    if (springs.size === 0) {
      snap();
      return;
    }
    startTicker();
    tick(1 / 60);
  }

  return {
    frame: () => f,
    subscribe(cb, hz = 0) {
      const s: Sub = { cb, minGapMs: hz > 0 ? 1000 / hz : 0, last: -Infinity };
      subs.add(s);
      return () => {
        subs.delete(s);
      };
    },
    setTarget,
    seek(p) {
      if (!activePlan || !tl) return;
      tl.pause();
      prog.p = clamp01(p);
      tl.progress(prog.p, true);
      publish(prog.p >= 1 ? activePlan.to : inputsAt(activePlan, prog.p), prog.p, prog.p < 1);
    },
    tick,
    plan: () => activePlan,
    target: () => target,
    snap,
    dispose() {
      killPlan();
      stopTicker();
      subs.clear();
    },
  };
}
