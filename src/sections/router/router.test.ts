import { describe, expect, it } from 'vitest';
import { DEFAULT_SYSTEM, MODE_TARGETS, getSystemView, routerSnapshot, stepAt, type ModeTarget } from '../../sim/system';
import { routerSentence } from './captions';
import { W_TOT, outputStrips, slabs } from './layout';
import { budget, MAX_PACKETS } from './usePackets';
import { stateFromStep } from './paint';

const view = getSystemView(DEFAULT_SYSTEM);
const stepFor = (m: ModeTarget) => stepAt(view.day(MODE_TARGETS[m].scenario, 'adaptive'), MODE_TARGETS[m].hour);

describe('router diagram', () => {
  it('branch slabs tile the trunk: total width constant while the pump runs, zero when it stops', () => {
    for (const m of ['A', 'B', 'C'] as const) {
      const t = stateFromStep(stepFor(m), DEFAULT_SYSTEM);
      const s = slabs({ bypass: t.vBypass, dhw: t.vDhw, tank: t.vTank, desiccant: t.vDesiccant });
      const total = s.bypass.w + s.dhw.w + s.tank.w + s.desiccant.w;
      expect(total).toBeCloseTo(t.pumpOn ? W_TOT : 0, 6);
      expect((t.vBypass + t.vDhw + t.vTank + t.vDesiccant) * W_TOT).toBeCloseTo(total, 6);
    }
  });

  it('output strips split the hot-water demand without exceeding the band', () => {
    const st = stepFor('A');
    const o = outputStrips(st.dhw.fromCollectorW, st.dhw.fromTankW, st.dhw.demandW);
    expect(o.direct + o.tank + o.backup).toBeCloseTo(W_TOT, 6);
  });

  it('sentences follow the computed state, not the preset letter', () => {
    for (const m of ['A', 'B', 'C'] as const) {
      const snap = routerSnapshot(stepFor(m));
      const text = routerSentence({ mode: snap.mode, pumpOn: snap.pumpOn, reason: snap.reason, backupShare: 0.2 });
      expect(text.length).toBeGreaterThan(20);
      if (!snap.pumpOn && snap.mode === 'C') expect(text).toMatch(/^Tanpa sinar/);
    }
  });

  it('packet budget never exceeds the pool', () => {
    const s = budget([
      { id: 'a', count: 40, speed: 1, fill: '', r: 1, opacity: 1 },
      { id: 'b', count: 40, speed: 1, fill: '', r: 1, opacity: 1 },
    ]);
    expect(s.reduce((n, x) => n + x.count, 0)).toBeLessThanOrEqual(MAX_PACKETS);
  });
});
