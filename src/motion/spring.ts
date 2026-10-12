/**
 * Motion maths. Pure, allocation-free, framework-free (safe in vitest/node).
 *
 * Springs are ALWAYS critically damped (zeta = 1): no bounce, exact step, frame-rate independent.
 * Settle to 2 % in about 5.83 / w seconds.
 */

export const clamp = (x: number, lo: number, hi: number): number => (x < lo ? lo : x > hi ? hi : x);
export const clamp01 = (x: number): number => (x < 0 ? 0 : x > 1 ? 1 : x);
export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

/** Hermite smoothstep between edges a < b. */
export const smoothstep = (a: number, b: number, x: number): number => {
  const t = clamp01((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};

/** Ken Perlin's smootherstep on t in [0, 1]: zero velocity AND acceleration at both ends, monotone. */
export const smootherstep = (t: number): number => {
  const x = clamp01(t);
  return x * x * x * (x * (x * 6 - 15) + 10);
};

/** Frame-rate independent first-order approach (rate in 1/s; 3.3 is roughly 0.9 s to 95 %). */
export const damp = (current: number, target: number, rate: number, dt: number): number =>
  target + (current - target) * Math.exp(-rate * dt);

export interface SpringState {
  x: number;
  v: number;
}

/**
 * Critically damped step (mutates `s`). `w` = natural frequency in rad/s.
 *   w = 7.3 camera (~800 ms) | w = 9 explode (~650 ms) | w = 22 input follow (~265 ms) | w = 3 slow ramps
 * Velocity is preserved when the goal changes, so retargeting never jerks.
 */
export function springStep(s: SpringState, goal: number, w: number, dt: number): number {
  const d = s.x - goal;
  const t = s.v + w * d;
  const e = Math.exp(-w * dt);
  s.x = goal + (d + t * dt) * e;
  s.v = (s.v - w * t * dt) * e;
  return s.x;
}

/** CSS-style cubic-bezier easing (x1,y1,x2,y2) as a function of t, usable as a GSAP ease. */
export function cubicBezier(x1: number, y1: number, x2: number, y2: number): (t: number) => number {
  const cx = 3 * x1;
  const bx = 3 * (x2 - x1) - cx;
  const ax = 1 - cx - bx;
  const cy = 3 * y1;
  const by = 3 * (y2 - y1) - cy;
  const ay = 1 - cy - by;
  const sx = (t: number) => ((ax * t + bx) * t + cx) * t;
  const sy = (t: number) => ((ay * t + by) * t + cy) * t;
  const dx = (t: number) => (3 * ax * t + 2 * bx) * t + cx;
  return (x: number) => {
    if (x <= 0) return 0;
    if (x >= 1) return 1;
    let t = x;
    for (let i = 0; i < 6; i++) {
      const err = sx(t) - x;
      if (Math.abs(err) < 1e-6) return sy(t);
      const d = dx(t);
      if (Math.abs(d) < 1e-6) break;
      t -= err / d;
    }
    let lo = 0;
    let hi = 1;
    t = x;
    for (let i = 0; i < 24; i++) {
      const v = sx(t);
      if (Math.abs(v - x) < 1e-6) break;
      if (v < x) lo = t;
      else hi = t;
      t = 0.5 * (lo + hi);
    }
    return sy(t);
  };
}
