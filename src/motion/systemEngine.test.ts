import { describe, expect, it } from 'vitest';
import { DEFAULT_SYSTEM, MODE_TARGETS, type ModeTarget } from '../sim/system';
import { classifyChange } from '../state/systemEngineBinding';
import { SINKS, createSystemEngine, type SystemEngine } from './systemEngine';
import { targetAt, type SystemTarget } from './systemTarget';
import { SYSTEM_MOTION as M } from './tokens';

const mode = (m: ModeTarget): SystemTarget => targetAt(DEFAULT_SYSTEM, MODE_TARGETS[m].scenario, 'adaptive', MODE_TARGETS[m].hour);
const at = (scenario: 'terik' | 'berawan' | 'hujan', hour: number): SystemTarget => targetAt(DEFAULT_SYSTEM, scenario, 'adaptive', hour);
const mkEngine = (t: SystemTarget, reduced = false): SystemEngine =>
  createSystemEngine(t, { reducedMotion: () => reduced, hidden: () => false, autoTick: false });
const sum = (r: Record<string, number>): number => Object.values(r).reduce((a, b) => a + b, 0);

const DT = 1 / 120;
interface Sample {
  t: number;
  G: number;
  amb: number;
  rh: number;
  wind: number;
  rain: number;
  inlet: number;
  hour: number;
  soc: number;
  top: number;
  valves: number[];
  Q: number;
  pump: boolean;
  sumValves: number;
}
function sample(e: SystemEngine, t: number): Sample {
  const f = e.frame();
  const r = f.router!;
  return {
    t,
    G: f.inputs.irradiance,
    amb: f.inputs.ambientC,
    rh: f.climate!.rh,
    wind: f.inputs.windMs,
    rain: f.inputs.rainMmH,
    inlet: f.inputs.inletC,
    hour: f.hour!,
    soc: r.tankSoc,
    top: r.tankTopC,
    valves: SINKS.map((k) => r.valves[k]),
    Q: sum(r.allocW),
    pump: r.pumpOn,
    sumValves: sum(r.valves),
  };
}
function run(e: SystemEngine, seconds: number, dt = DT): Sample[] {
  const out: Sample[] = [sample(e, 0)];
  const n = Math.round(seconds / dt);
  for (let i = 1; i <= n; i++) {
    e.tick(dt);
    out.push(sample(e, i * dt));
  }
  return out;
}

const PAIRS: [ModeTarget, ModeTarget][] = [
  ['A', 'B'],
  ['B', 'A'],
  ['A', 'C'],
  ['C', 'A'],
  ['B', 'C'],
  ['C', 'B'],
];
const SCALARS = ['G', 'amb', 'rh', 'wind', 'rain', 'inlet', 'hour', 'soc', 'top'] as const;

describe('v2 scripted transition (mode A/B/C)', () => {
  for (const [a, b] of PAIRS) {
    it(`${a} -> ${b}: every continuous quantity is monotone and never leaves its endpoints`, () => {
      const e = mkEngine(mode(a));
      const s0 = sample(e, 0);
      e.setTarget(mode(b), { kind: 'scripted' });
      const rows = run(e, 1.6);
      const sEnd = rows[rows.length - 1] as Sample;
      for (const k of SCALARS) {
        const lo = Math.min(s0[k], sEnd[k]) - 1e-6;
        const hi = Math.max(s0[k], sEnd[k]) + 1e-6;
        const dir = Math.sign(sEnd[k] - s0[k]);
        for (let i = 0; i < rows.length; i++) {
          const x = (rows[i] as Sample)[k];
          expect(x, `${k} overshoot at ${i}`).toBeGreaterThanOrEqual(lo);
          expect(x, `${k} overshoot at ${i}`).toBeLessThanOrEqual(hi);
          if (i > 0 && dir !== 0) expect(dir * (x - (rows[i - 1] as Sample)[k]), `${k} not monotone at ${i}`).toBeGreaterThanOrEqual(-1e-6);
        }
      }
      expect(e.frame().moving).toBe(false);
      expect(e.scripted()).toBe(false);
    });
  }

  it('lasts about 1,1 s: the sky is done by ~0,75 s and the whole frame is idle by ~1,4 s', () => {
    const e = mkEngine(mode('A'));
    e.setTarget(mode('C'), { kind: 'scripted' });
    const G0 = mode('A').inputs.irradiance;
    const G1 = mode('C').inputs.irradiance;
    let tSky = -1;
    let tIdle = -1;
    for (let i = 1; i <= 240; i++) {
      e.tick(DT);
      const f = e.frame();
      if (tSky < 0 && Math.abs(f.inputs.irradiance - G1) < 0.02 * (G0 - G1)) tSky = i * DT;
      if (tIdle < 0 && !f.moving) tIdle = i * DT;
    }
    expect(tSky).toBeGreaterThan(0.3);
    expect(tSky).toBeLessThan(0.75);
    expect(tIdle).toBeGreaterThan(M.transition * 0.9);
    expect(tIdle).toBeLessThan(1.45);
  });

  it('the router rule switches inside 0,35 - 0,6 T and the valves start at 0,4 T', () => {
    const e = mkEngine(mode('A'));
    e.setTarget(mode('C'), { kind: 'scripted' });
    const rows = run(e, 1.2);
    const tSwitch = (rows.find((s) => !s.pump) as Sample).t;
    expect(tSwitch).toBeGreaterThanOrEqual(0.35 * M.transition - 2 * DT);
    expect(tSwitch).toBeLessThanOrEqual(0.6 * M.transition + 2 * DT);
    expect(e.frame().router!.mode).toBe('C');
    expect(e.frame().router!.reason).toBe(mode('C').router.reason);
    const v0 = (rows[0] as Sample).valves.join();
    expect(rows.filter((s) => s.t < 0.4 * M.transition - DT).every((s) => s.valves.join() === v0)).toBe(true);
  });

  it('valve fractions sum to 1 whenever the pump is on, and valve speed is rate limited', () => {
    // 8 h -> 9 h terik: dhw/bypass -> dhw/tank, a real valve stroke while the pump runs
    const e = mkEngine(at('terik', 8));
    e.setTarget(at('terik', 9), { kind: 'scripted' });
    const rows = run(e, 1.6);
    let maxSpeed = 0;
    let moved = 0;
    for (let i = 0; i < rows.length; i++) {
      const s = rows[i] as Sample;
      if (s.pump) expect(Math.abs(s.sumValves - 1)).toBeLessThan(1e-9);
      if (i > 0) for (let j = 0; j < 4; j++) maxSpeed = Math.max(maxSpeed, Math.abs((s.valves[j] as number) - ((rows[i - 1] as Sample).valves[j] as number)) / DT);
      moved = Math.max(moved, Math.abs((s.valves[1] as number) - ((rows[0] as Sample).valves[1] as number)));
    }
    expect(moved).toBeGreaterThan(0.5);
    expect(maxSpeed).toBeLessThanOrEqual(M.valveVmax + 0.05);
  });

  it('allocW sums to the collected heat, never above what the visual collector delivers', () => {
    const A = mode('A');
    const e = mkEngine(mode('C'));
    e.setTarget(A, { kind: 'scripted' });
    for (let i = 0; i < 300; i++) {
      e.tick(DT);
      const f = e.frame();
      const r = f.router!;
      if (!r.pumpOn) expect(sum(r.allocW)).toBe(0);
      if (f.moving) expect(sum(r.allocW)).toBeLessThanOrEqual(A.modules * Math.max(0, f.result.qLiquidW) + 1e-6);
    }
    const f = e.frame();
    expect(f.moving).toBe(false);
    expect(sum(f.router!.allocW)).toBeCloseTo(sum(A.router.allocW), -1);
    for (const k of SINKS) expect(f.router!.valves[k]).toBeCloseTo(A.router.valves[k], 3);
  });

  it('the settled frame equals the target (inputs, router, climate, hour) and is a real simulate()', () => {
    const e = mkEngine(mode('A'));
    for (const m of ['C', 'B', 'A'] as const) {
      e.setTarget(mode(m), { kind: 'scripted' });
      run(e, 2);
      const f = e.frame();
      const t = mode(m);
      expect(f.moving).toBe(false);
      expect(f.progress).toBe(1);
      expect(f.inputs.irradiance).toBe(t.inputs.irradiance);
      expect(f.inputs.inletC).toBe(t.inputs.inletC);
      expect(f.inputs.humidityRatio).toBe(t.climate.humidityRatio);
      expect(f.inputs.pumpControl).toBe(t.router.pumpOn ? 'on' : 'off');
      expect(f.router!.mode).toBe(t.router.mode);
      expect(f.router!.pumpOn).toBe(t.router.pumpOn);
      expect(f.hour).toBe(t.hour);
      expect(f.result.config).toBe('pvt-liquid');
    }
  });
});

describe('reduced motion / hidden tab / first load', () => {
  it('snaps under the reduced-motion flag (one frame, not moving), scripted and follow', () => {
    const e = mkEngine(mode('A'), true);
    const epoch = e.frame().epoch;
    e.setTarget(mode('C'), { kind: 'scripted' });
    const f = e.frame();
    expect(f.moving).toBe(false);
    expect(f.progress).toBe(1);
    expect(f.epoch).toBe(epoch + 1);
    expect(f.inputs.irradiance).toBe(mode('C').inputs.irradiance);
    expect(f.router!.pumpOn).toBe(false);
    expect(f.router!.mode).toBe('C');
    e.setTarget(at('terik', 9), { kind: 'follow' });
    expect(e.frame().moving).toBe(false);
    expect(e.frame().hour).toBeCloseTo(9, 9);
    expect(Math.abs(sum(e.frame().router!.valves) - 1)).toBeLessThan(1e-9);
  });
  it('snaps when the tab is hidden', () => {
    const e = createSystemEngine(mode('A'), { reducedMotion: () => false, hidden: () => true, autoTick: false });
    e.setTarget(mode('B'), { kind: 'scripted' });
    expect(e.frame().moving).toBe(false);
    expect(e.frame().inputs.irradiance).toBe(mode('B').inputs.irradiance);
  });
  it('the first frame is the target', () => {
    const e = mkEngine(mode('B'));
    expect(e.frame().moving).toBe(false);
    expect(e.frame().inputs.irradiance).toBe(mode('B').inputs.irradiance);
    expect(e.frame().hour).toBe(mode('B').hour);
  });
});

describe('retargeting mid-flight', () => {
  it('A -> C, back to A at 0,35 s: continuous, no jump, no overshoot', () => {
    const A = mode('A');
    const C = mode('C');
    const e = mkEngine(A);
    e.setTarget(C, { kind: 'scripted' });
    const rows = run(e, 0.35);
    const before = rows[rows.length - 1] as Sample;
    e.setTarget(A, { kind: 'scripted' });
    const right = sample(e, before.t);
    for (const k of SCALARS) expect(Math.abs(right[k] - before[k]), k).toBeLessThan(1e-9);
    const all = [...rows, ...run(e, 2)];
    let maxStepG = 0;
    for (let i = 1; i < all.length; i++) maxStepG = Math.max(maxStepG, Math.abs((all[i] as Sample).G - (all[i - 1] as Sample).G));
    // a critically damped spring peaks at w d / e: 9,7 x 880 / e = 3,1 kW/m2/s = 26 W/m2 per 1/120 s
    expect(maxStepG).toBeLessThan((M.climateW * (A.inputs.irradiance - C.inputs.irradiance)) / Math.E * DT * 1.05);
    for (const s of all) {
      expect(s.G).toBeGreaterThanOrEqual(C.inputs.irradiance - 1e-6);
      expect(s.G).toBeLessThanOrEqual(A.inputs.irradiance + 1e-6);
    }
    const f = e.frame();
    expect(f.moving).toBe(false);
    expect(f.inputs.irradiance).toBe(A.inputs.irradiance);
    expect(f.router!.pumpOn).toBe(true);
    // the router never reached its switch: the pump command did not flip at all
    expect(all.filter((s, i) => i > 0 && s.pump !== (all[i - 1] as Sample).pump).length).toBe(0);
  });

  it('rapid A -> B -> C -> A -> B (0,12 s apart) ends on B without a jump or a stuck state', () => {
    const e = mkEngine(mode('A'));
    let prevG = e.frame().inputs.irradiance;
    for (const m of ['B', 'C', 'A', 'B'] as const) {
      e.setTarget(mode(m), { kind: 'scripted' });
      for (let i = 0; i < Math.round(0.12 / DT); i++) {
        e.tick(DT);
        const G = e.frame().inputs.irradiance;
        expect(Math.abs(G - prevG)).toBeLessThan(30);
        prevG = G;
      }
    }
    run(e, 2);
    expect(e.frame().moving).toBe(false);
    expect(e.frame().inputs.irradiance).toBe(mode('B').inputs.irradiance);
    expect(e.frame().router!.reason).toBe(mode('B').router.reason);
  });
});

describe('hour scrubbing (follow springs, no script)', () => {
  it('lags a dragged hour, never overshoots, and settles after release', () => {
    const e = mkEngine(at('terik', 6));
    let lastHour = e.frame().hour as number;
    for (const h of [6, 7, 8, 9, 10, 11, 12, 13]) {
      e.setTarget(at('terik', h), { kind: 'follow' });
      expect(e.scripted()).toBe(false);
      for (let i = 0; i < 6; i++) {
        e.tick(DT);
        const f = e.frame();
        expect(f.hour as number).toBeGreaterThanOrEqual(lastHour - 1e-9);
        expect(f.hour as number).toBeLessThanOrEqual(h + 1e-9);
        lastHour = f.hour as number;
        if (f.router!.pumpOn) expect(Math.abs(sum(f.router!.valves) - 1)).toBeLessThan(1e-9);
      }
    }
    expect(e.frame().hour as number).toBeLessThan(13);
    run(e, 1);
    expect(e.frame().moving).toBe(false);
    expect(e.frame().hour).toBeCloseTo(13, 6);
    expect(e.frame().inputs.irradiance).toBe(at('terik', 13).inputs.irradiance);
  });

  it('a follow target arriving during a scripted transition takes over without a jump', () => {
    const e = mkEngine(mode('A'));
    e.setTarget(mode('C'), { kind: 'scripted' });
    run(e, 0.3);
    const before = e.frame().inputs.irradiance;
    e.setTarget(at('terik', 21), { kind: 'follow' });
    expect(Math.abs(e.frame().inputs.irradiance - before)).toBeLessThan(1e-9);
    expect(e.scripted()).toBe(false);
    run(e, 1.5);
    expect(e.frame().moving).toBe(false);
    expect(e.frame().hour).toBeCloseTo(21, 6);
  });
});

describe('binding classification', () => {
  const base = { sys: DEFAULT_SYSTEM, scenario: 'terik' as const, strategy: 'adaptive' as const, hour: 13, modeTarget: 'A' as const };
  it('mode letter, scenario and strategy changes are scripted; hour scrubbing and system edits follow', () => {
    expect(classifyChange(base, { ...base, modeTarget: 'B', scenario: 'hujan', hour: 15 })).toBe('scripted');
    expect(classifyChange(base, { ...base, scenario: 'hujan', modeTarget: 'custom' })).toBe('scripted');
    expect(classifyChange(base, { ...base, strategy: 'dhw-priority' })).toBe('scripted');
    expect(classifyChange(base, { ...base, hour: 14, modeTarget: 'custom' })).toBe('follow');
    expect(classifyChange({ ...base, modeTarget: 'custom' }, { ...base, modeTarget: 'custom', sys: structuredClone(DEFAULT_SYSTEM) })).toBe('follow');
  });
});
