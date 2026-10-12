/**
 * Critically damped spring (zeta = 1, no bounce), exact and frame-rate independent.
 * Same maths as MOTION_SYSTEM.md section 2 (`springStep`). Settles to 2 % in about 5.83 / w seconds:
 * camera w = 7.3 (800 ms), explode w = 9 (650 ms). Velocity survives a retarget.
 */
export class Spring {
  x: number;
  v = 0;
  constructor(x = 0) {
    this.x = x;
  }
  step(goal: number, w: number, dt: number): number {
    const d = this.x - goal;
    const t = this.v + w * d;
    const e = Math.exp(-w * dt);
    this.x = goal + (d + t * dt) * e;
    this.v = (this.v - w * t * dt) * e;
    return this.x;
  }
  /** True when position and speed are both negligible relative to the goal. */
  settled(goal: number, eps = 0.0005, veps = 0.002): boolean {
    return Math.abs(this.x - goal) < eps && Math.abs(this.v) < veps;
  }
  snap(x: number): void {
    this.x = x;
    this.v = 0;
  }
}

/** First-order exponential approach (frame-rate independent). */
export const dampTo = (x: number, goal: number, rate: number, dt: number): number => goal + (x - goal) * Math.exp(-rate * dt);

export const clamp = (x: number, lo: number, hi: number): number => (x < lo ? lo : x > hi ? hi : x);
export const clamp01 = (x: number): number => (x < 0 ? 0 : x > 1 ? 1 : x);
export const smoothstep = (a: number, b: number, x: number): number => {
  const t = clamp01((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};
