/** Small pure helpers shared by the scene effects. No allocations in hot paths. */

export const clamp = (x: number, lo: number, hi: number): number => (x < lo ? lo : x > hi ? hi : x);
export const clamp01 = (x: number): number => (x < 0 ? 0 : x > 1 ? 1 : x);
export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;
export const fract = (x: number): number => x - Math.floor(x);

export const smoothstep = (a: number, b: number, x: number): number => {
  const t = clamp01((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};

/** Frame-rate independent exponential approach. `rate` in 1/s (3.3 ≈ 0.9 s to settle). */
export const damp = (current: number, target: number, rate: number, dt: number): number =>
  current + (target - current) * (1 - Math.exp(-rate * dt));

/** Rate giving ≈ 95 % convergence in ~0.9 s (the scene transition time). */
export const SCENE_RATE = 3.3;

/**
 * Log-ish 0..1 scaling of a heat-flow magnitude [W]. 10 W ≈ 0.09, 100 W ≈ 0.41, 1 kW ≈ 0.9.
 * Keeps small flows visible without letting big ones saturate immediately.
 */
export const heatStrength = (watts: number): number => {
  const a = Math.abs(watts);
  return clamp01(Math.log10(1 + a / 20) / Math.log10(1 + 1500 / 20));
};

/** Radical-inverse low-discrepancy sequence (base b), index ≥ 1. */
export const halton = (index: number, base: number): number => {
  let f = 1;
  let r = 0;
  let i = index;
  while (i > 0) {
    f /= base;
    r += f * (i % base);
    i = Math.floor(i / base);
  }
  return r;
};

/** Deterministic integer hash → [0, 1). */
export const hash01 = (seed: number): number => {
  let n = seed | 0;
  n = (n ^ 61) ^ (n >>> 16);
  n = (n + (n << 3)) | 0;
  n ^= n >>> 4;
  n = Math.imul(n, 0x27d4eb2d);
  n ^= n >>> 15;
  return (n >>> 0) / 4294967296;
};

/** Raycast no-op so decorative effects never steal pointer events from the collector. */
export const noRaycast = (): void => undefined;
