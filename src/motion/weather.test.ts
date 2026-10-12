import { describe, expect, it } from 'vitest';
import { PRESETS, clampInputs, simulate } from '../sim';
import { springStep } from './spring';
import { createWeatherEngine, inputsAt, planTransition } from './weather';

const SUNNY = clampInputs(PRESETS.sunny);
const RAINY = clampInputs(PRESETS.rainy);
const mk = (init = SUNNY) => createWeatherEngine(init, { reducedMotion: () => false, hidden: () => false, autoTick: false });

describe('spring', () => {
  it('critically damped: no overshoot, settles', () => {
    const s = { x: 0, v: 0 };
    let max = 0;
    for (let i = 0; i < 240; i++) max = Math.max(max, springStep(s, 1, 9, 1 / 120));
    expect(max).toBeLessThanOrEqual(1 + 1e-9);
    expect(Math.abs(s.x - 1)).toBeLessThan(0.01);
  });
});

describe('plan Cerah -> Hujan', () => {
  const plan = planTransition(SUNNY, RAINY);
  it('holds the pump and switches flags at the q zero crossing', () => {
    expect(plan.hold).toBe(true);
    expect(plan.pStar).toBeGreaterThan(0.1);
    expect(plan.pStar).toBeLessThan(0.95);
    const before = inputsAt(plan, plan.pStar - 0.02);
    const after = inputsAt(plan, plan.pStar + 0.02);
    expect(before.heatLoadAvailable).toBe(true);
    expect(after.hotSourceAvailable).toBe(true);
    expect(simulate(before).qLiquidW).toBeGreaterThan(0);
    expect(simulate(after).qLiquidW).toBeLessThan(0);
  });
  it('every intermediate state keeps the pump on (no stagnation spike) and q is monotone', () => {
    let prevQ = Infinity;
    let prevPe = Infinity;
    let maxCell = -Infinity;
    for (let i = 0; i <= 200; i++) {
      const r = simulate(inputsAt(plan, i / 200));
      expect(r.pumpOn).toBe(true);
      expect(r.qLiquidW).toBeLessThanOrEqual(prevQ + 1e-6);
      expect(r.electricalW).toBeLessThanOrEqual(prevPe + 0.1); // monotone to within 0.1 W (tail ripple from the cell temperature)
      prevQ = r.qLiquidW;
      prevPe = r.electricalW;
      maxCell = Math.max(maxCell, r.cellC);
    }
    expect(maxCell).toBeLessThan(simulate(SUNNY).stagnationC);
  });
  it('cell and outlet temperatures stay between their endpoints in both directions (QA D-05)', () => {
    for (const [a, b] of [[SUNNY, RAINY], [RAINY, SUNNY]] as const) {
      const p = planTransition(a, b);
      const ea = simulate(a);
      const eb = simulate(b);
      for (let i = 0; i <= 200; i++) {
        const r = simulate(inputsAt(p, i / 200));
        expect(r.cellC).toBeGreaterThanOrEqual(Math.min(ea.cellC, eb.cellC) - 0.5);
        expect(r.cellC).toBeLessThanOrEqual(Math.max(ea.cellC, eb.cellC) + 0.5);
        expect(r.outletC).toBeGreaterThanOrEqual(Math.min(ea.outletC, eb.outletC) - 1);
        expect(r.outletC).toBeLessThanOrEqual(Math.max(ea.outletC, eb.outletC) + 1);
      }
    }
  });
  it('inputs never leave their endpoints (no overshoot)', () => {
    for (let i = 0; i <= 100; i++) {
      const x = inputsAt(plan, i / 100);
      for (const k of ['irradiance', 'ambientC', 'rainMmH', 'windMs', 'inletC', 'flowLpm'] as const) {
        const lo = Math.min(SUNNY[k], RAINY[k]);
        const hi = Math.max(SUNNY[k], RAINY[k]);
        expect(x[k]).toBeGreaterThanOrEqual(lo - 1e-9);
        expect(x[k]).toBeLessThanOrEqual(hi + 1e-9);
      }
    }
  });
  it('the last frame is exactly the target', () => {
    expect(inputsAt(plan, 1)).toBe(RAINY);
  });
});

describe('engine', () => {
  it('scripted transition: frames are computed states; ends on the exact target', () => {
    const e = mk();
    e.setTarget(RAINY);
    expect(e.plan()).not.toBeNull();
    const qs: number[] = [];
    for (let i = 0; i <= 50; i++) {
      e.seek(i / 50);
      qs.push(e.frame().result.qLiquidW);
    }
    for (let i = 1; i < qs.length; i++) expect(qs[i]!).toBeLessThanOrEqual(qs[i - 1]! + 1e-6);
    expect(e.frame().result.qLiquidW).toBeCloseTo(simulate(RAINY).qLiquidW, 6);
  });
  it('retarget mid-flight starts from the current visual inputs (continuity) and never overshoots', () => {
    const e = mk();
    e.setTarget(RAINY);
    e.seek(0.4);
    const g = e.frame().inputs.irradiance;
    const q = e.frame().result.qLiquidW;
    e.setTarget(SUNNY);
    expect(e.frame().inputs.irradiance).toBeCloseTo(g, 6);
    expect(e.frame().result.qLiquidW).toBeCloseTo(q, 3);
    let max = -Infinity;
    for (let i = 0; i <= 50; i++) {
      e.seek(i / 50);
      max = Math.max(max, e.frame().inputs.irradiance);
      expect(e.frame().inputs.irradiance).toBeLessThanOrEqual(SUNNY.irradiance + 1e-9);
      expect(e.frame().inputs.irradiance).toBeGreaterThanOrEqual(RAINY.irradiance - 1e-9);
    }
    expect(max).toBeLessThanOrEqual(SUNNY.irradiance + 1e-9);
  });
  it('slider edits follow with a spring and settle exactly on the target', () => {
    const e = mk();
    const next = { ...SUNNY, irradiance: 500 };
    e.setTarget(next);
    expect(e.plan()).toBeNull();
    let last = e.frame().inputs.irradiance;
    expect(last).toBeGreaterThan(500);
    for (let i = 0; i < 120; i++) {
      e.tick(1 / 60);
      const g = e.frame().inputs.irradiance;
      expect(g).toBeLessThanOrEqual(last + 1e-9);
      expect(g).toBeGreaterThanOrEqual(500 - 1e-9);
      last = g;
    }
    expect(e.frame().inputs.irradiance).toBe(500);
    expect(e.frame().moving).toBe(false);
  });
  it('reduced motion snaps', () => {
    const e = createWeatherEngine(SUNNY, { reducedMotion: () => true, hidden: () => false, autoTick: false });
    e.setTarget(RAINY);
    expect(e.plan()).toBeNull();
    expect(e.frame().inputs).toBe(RAINY);
  });
  it('throttled subscribers get a final flush', () => {
    const e = mk();
    let t = 0;
    const seen: number[] = [];
    e.subscribe((f) => seen.push(f.progress), 1); // 1 Hz: almost everything is throttled
    void t;
    e.setTarget(RAINY);
    for (let i = 1; i <= 10; i++) e.seek(i / 10);
    expect(seen[seen.length - 1]).toBe(1);
  });
});
