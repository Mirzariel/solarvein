import { describe, expect, it } from 'vitest';
import type { ControllerParams, RouterInput, RouterState, RouterStrategy, Sink } from '../contract';
import { ROUTER_ASSUMPTIONS } from '../assumptions/router';
import { allocate, IRRADIANCE_COLLECT_MIN } from '../router';

const SINKS: Sink[] = ['dhw', 'desiccant', 'tank', 'bypass'];
const STRATEGIES: RouterStrategy[] = ['dhw-priority', 'fixed-schedule', 'adaptive'];

/** Tiny deterministic PRNG (mulberry32). */
function prng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const params = (strategy: RouterStrategy): ControllerParams => ({
  strategy,
  onK: 8,
  offK: 3,
  desiccantMinRegenC: 70,
});

function base(over: Partial<RouterInput> = {}, strategy: RouterStrategy = 'adaptive'): RouterInput {
  return {
    qAvailableW: 5000,
    collectorOutletC: 60,
    tankTopC: 50,
    tankBottomC: 35,
    tankMaxC: 80,
    dhwDemandW: 2000,
    desiccantWanted: false,
    irradiance: 700,
    hourOfDay: 9,
    params: params(strategy),
    ...over,
  };
}

function randomInput(r: () => number, strategy: RouterStrategy): RouterInput {
  const bottom = 25 + r() * 40;
  const top = bottom + r() * 30;
  return {
    qAvailableW: r() < 0.1 ? 0 : r() * 20000,
    collectorOutletC: 20 + r() * 80,
    tankTopC: top,
    tankBottomC: bottom,
    tankMaxC: 75 + r() * 10,
    dhwDemandW: r() < 0.3 ? 0 : r() * 15000,
    desiccantWanted: r() < 0.5,
    irradiance: r() < 0.25 ? r() * 40 : r() * 1000,
    hourOfDay: r() * 24,
    params: { ...params(strategy), onK: 4 + r() * 8, offK: 1 + r() * 3, desiccantMinRegenC: 55 + r() * 25 },
    prev: undefined,
  };
}

const sum = (rec: Record<Sink, number>) => SINKS.reduce((s, k) => s + rec[k], 0);

describe('router: invariants over seeded random inputs', () => {
  const r = prng(20260117);
  const cases: RouterInput[] = [];
  let prev: RouterState | undefined;
  for (let i = 0; i < 4000; i++) {
    const input = randomInput(r, STRATEGIES[i % 3]!);
    if (r() < 0.5) input.prev = prev;
    const out = allocate(input);
    prev = out;
    cases.push(input);
  }

  it('conserves heat (Σ alloc = qAvailable when pump on), non-negative, valves Σ = 1', () => {
    for (const input of cases) {
      const out = allocate(input);
      for (const s of SINKS) {
        expect(out.allocW[s]).toBeGreaterThanOrEqual(0);
        expect(out.valves[s]).toBeGreaterThanOrEqual(0);
        expect(out.valves[s]).toBeLessThanOrEqual(1 + 1e-12);
      }
      if (out.pumpOn) {
        expect(Math.abs(sum(out.allocW) - input.qAvailableW)).toBeLessThanOrEqual(
          1e-9 * input.qAvailableW,
        );
        expect(Math.abs(sum(out.valves) - 1)).toBeLessThanOrEqual(1e-9);
        expect(out.mode).toBe('A');
      } else {
        expect(sum(out.allocW)).toBe(0);
        expect(sum(out.valves)).toBe(0);
        expect(out.mode).not.toBe('A');
      }
    }
  });

  it('pump is off when the collector is not warmer than the tank bottom (cold start)', () => {
    for (const input of cases) {
      const fresh = { ...input, prev: undefined };
      if (fresh.collectorOutletC - fresh.tankBottomC <= fresh.params.onK) {
        expect(allocate(fresh).pumpOn).toBe(false);
      }
      // Even when running, a collector colder than the tank bottom (offK > 0) must stop.
      const running = { ...input, prev: allocate(base()) };
      if (running.collectorOutletC <= running.tankBottomC) {
        expect(allocate(running).pumpOn).toBe(false);
      }
    }
  });

  it('mode C below the irradiance threshold regardless of strategy, pump off, no heat', () => {
    for (const input of cases) {
      if (input.irradiance < IRRADIANCE_COLLECT_MIN) {
        const out = allocate(input);
        expect(out.mode).toBe('C');
        expect(out.pumpOn).toBe(false);
        expect(sum(out.allocW)).toBe(0);
      }
    }
  });

  it("'dhw-priority' never allocates desiccant", () => {
    for (const input of cases) {
      const out = allocate({ ...input, params: { ...input.params, strategy: 'dhw-priority' } });
      expect(out.allocW.desiccant).toBe(0);
    }
  });

  it("'adaptive' never sends heat to the desiccant below desiccantMinRegenC (cold start)", () => {
    for (const input of cases) {
      const out = allocate({ ...input, params: { ...input.params, strategy: 'adaptive' }, prev: undefined });
      if (input.collectorOutletC < input.params.desiccantMinRegenC) {
        expect(out.allocW.desiccant).toBe(0);
      }
      if (!input.desiccantWanted) expect(out.allocW.desiccant).toBe(0);
    }
  });

  it('bypass only when DHW is saturated and the tank is full (or desiccant too cold)', () => {
    for (const input of cases) {
      if (input.params.strategy === 'fixed-schedule') continue;
      const out = allocate(input);
      if (out.allocW.bypass > 0) {
        expect(out.allocW.dhw).toBeCloseTo(Math.max(0, input.dhwDemandW), 6);
        expect(out.allocW.tank).toBe(0);
        expect(input.tankTopC).toBeGreaterThanOrEqual(input.tankMaxC - 1);
        if (out.allocW.bypass > Math.max(out.allocW.dhw, out.allocW.tank, out.allocW.desiccant)) {
          expect(['tangki-penuh-bypass', 'desikan-terlalu-dingin']).toContain(out.reason);
        }
      }
      expect(out.allocW.dhw).toBeLessThanOrEqual(Math.max(0, input.dhwDemandW) + 1e-9);
    }
  });

  it('hourOfDay is ignored by non-schedule strategies', () => {
    for (const input of cases) {
      for (const strategy of ['dhw-priority', 'adaptive'] as const) {
        const a = allocate({ ...input, params: { ...input.params, strategy }, hourOfDay: 3 });
        const b = allocate({ ...input, params: { ...input.params, strategy }, hourOfDay: 12.5 });
        expect(b).toEqual(a);
      }
    }
  });
});

describe('router: strategy behaviour', () => {
  it('dhw-priority: DHW first, then tank, then bypass when the tank is full', () => {
    const out = allocate(base({}, 'dhw-priority'));
    expect(out.allocW.dhw).toBe(2000);
    expect(out.allocW.tank).toBe(3000);
    expect(out.reason).toBe('isi-tangki');
    const full = allocate(base({ tankTopC: 80 }, 'dhw-priority'));
    expect(full.allocW.bypass).toBe(3000);
    expect(full.reason).toBe('tangki-penuh-bypass');
  });

  it('adaptive: remaining heat goes to the desiccant only when the tank is full and the outlet is hot enough', () => {
    const hot = allocate(
      base({ tankTopC: 80, collectorOutletC: 85, desiccantWanted: true }),
    );
    expect(hot.allocW.desiccant).toBe(3000);
    expect(hot.reason).toBe('regenerasi-desikan');
    const cold = allocate(
      base({ tankTopC: 80, collectorOutletC: 65, desiccantWanted: true }),
    );
    expect(cold.allocW.desiccant).toBe(0);
    expect(cold.allocW.bypass).toBe(3000);
    expect(cold.reason).toBe('desikan-terlalu-dingin');
  });

  it('adaptive: DHW demand wins over the desiccant', () => {
    const out = allocate(
      base({ collectorOutletC: 85, desiccantWanted: true, dhwDemandW: 5000 }),
    );
    expect(out.allocW.dhw).toBe(5000);
    expect(out.allocW.desiccant).toBe(0);
    expect(out.reason).toBe('prioritas-air-panas');
  });

  it('fixed-schedule: sends heat to the desiccant 11-15 h even below the minimum temperature', () => {
    const inWin = allocate(
      base({ hourOfDay: 12, desiccantWanted: true, collectorOutletC: 55 }, 'fixed-schedule'),
    );
    expect(inWin.allocW.desiccant).toBe(5000);
    expect(inWin.reason).toBe('jadwal-tetap');
    const outWin = allocate(
      base({ hourOfDay: 9, desiccantWanted: true, collectorOutletC: 55 }, 'fixed-schedule'),
    );
    expect(outWin.allocW.desiccant).toBe(0);
    expect(outWin.reason).toBe('isi-tangki');
    const notWanted = allocate(
      base({ hourOfDay: 12, desiccantWanted: false }, 'fixed-schedule'),
    );
    expect(notWanted.allocW.desiccant).toBe(0);
  });

  it('pump off: reasons and mode B/C', () => {
    const cold = allocate(base({ collectorOutletC: 38, dhwDemandW: 0 }));
    expect(cold).toMatchObject({ mode: 'B', pumpOn: false, reason: 'pompa-mati-kolektor-lebih-dingin' });
    const discharge = allocate(base({ collectorOutletC: 38, dhwDemandW: 3000 }));
    expect(discharge).toMatchObject({ mode: 'B', pumpOn: false, reason: 'lepas-simpanan' });
    const night = allocate(base({ irradiance: 0, qAvailableW: 0, dhwDemandW: 3000 }));
    expect(night).toMatchObject({ mode: 'C', pumpOn: false, reason: 'lepas-simpanan' });
  });

  it('pump hysteresis: starts above onK, keeps running above offK', () => {
    // dT = 5 K: between offK (3) and onK (8)
    const marginal = base({ collectorOutletC: 40 });
    expect(allocate(marginal).pumpOn).toBe(false);
    const prevOn = allocate(base());
    expect(prevOn.pumpOn).toBe(true);
    expect(allocate({ ...marginal, prev: prevOn }).pumpOn).toBe(true);
    expect(allocate({ ...marginal, collectorOutletC: 37.5, prev: prevOn }).pumpOn).toBe(false);
  });
});

describe('router: hysteresis over a synthetic 24 h ramp', () => {
  function run(useHysteresis: boolean) {
    const r = prng(7);
    let prev: RouterState | undefined;
    let pumpSwitches = 0;
    let desiccantSwitches = 0;
    let lastPump = false;
    let lastDes = false;
    for (let step = 0; step <= 24 * 12; step++) {
      const h = step / 12;
      const sun = Math.max(0, Math.sin(((h - 6) / 12) * Math.PI)); // 06-18 h
      const noise = (r() - 0.5) * 2; // ±1 K
      const out = allocate({
        qAvailableW: 8000 * sun,
        collectorOutletC: 35 + 50 * sun + noise,
        tankTopC: 80,
        tankBottomC: 38,
        tankMaxC: 80,
        dhwDemandW: 0,
        desiccantWanted: true,
        irradiance: 1000 * sun,
        hourOfDay: h,
        params: params('adaptive'),
        prev: useHysteresis ? prev : undefined,
      });
      prev = out;
      const des = out.allocW.desiccant > 0;
      if (out.pumpOn !== lastPump) pumpSwitches++;
      if (des !== lastDes) desiccantSwitches++;
      lastPump = out.pumpOn;
      lastDes = des;
    }
    return { pumpSwitches, desiccantSwitches };
  }

  it('limits pump and desiccant switching to a few events per day', () => {
    const withH = run(true);
    expect(withH.pumpSwitches).toBeLessThanOrEqual(4);
    expect(withH.desiccantSwitches).toBeLessThanOrEqual(4);
    expect(withH.desiccantSwitches).toBeGreaterThanOrEqual(2); // it does turn on and off
  });

  it('chatters more without the hysteresis state (control experiment)', () => {
    const withH = run(true);
    const without = run(false);
    expect(without.desiccantSwitches).toBeGreaterThan(withH.desiccantSwitches);
  });
});

describe('router assumptions', () => {
  it('are Indonesian, tagged, uniquely identified, and cite the ranking basis', () => {
    const ids = new Set(ROUTER_ASSUMPTIONS.map((a) => a.id));
    expect(ids.size).toBe(ROUTER_ASSUMPTIONS.length);
    expect(ROUTER_ASSUMPTIONS.some((a) => /0,27/.test(a.body))).toBe(true);
    expect(ROUTER_ASSUMPTIONS.some((a) => /carbon-aware/.test(a.title))).toBe(true);
    for (const a of ROUTER_ASSUMPTIONS) expect(a.tag).toBeTruthy();
  });
});
