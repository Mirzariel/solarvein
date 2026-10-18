import { LABELS, type ControllerMode, type DayStep, type RouterReason, type Sink } from '../../sim/system';
import { formatWithUnit } from '../../ui';

/**
 * v2 statement of the Sistem section: ONE sentence + ONE detail line, keyed by the COMPUTED router mode and reason
 * (never by the A/B/C button the user pressed). The sentence is LABELS.reason verbatim (the single source of truth for
 * what the router is doing); the detail line adds the live numbers of the same DayStep. Labels name conditions.
 */
export interface Statement {
  /** `${mode}|${reason}`: changes only when the computed state changes, not when numbers tick. */
  key: string;
  mode: ControllerMode;
  reason: RouterReason;
  tone: 'heat' | 'neutral';
  /** Mode label with a 6 px dot ("A · Panas tersedia"), straight from LABELS.mode. */
  pill: string;
  /** The one sentence (LABELS.reason). */
  headline: string;
  /** One short supporting line with numbers from the same step. */
  detail: string;
}

const degC = (n: number): string => formatWithUnit(n, '°C', 0);

export function describeStep(step: DayStep): Statement {
  const { router, collector: c, tank, dhw } = step;
  let detail: string;
  if (router.pumpOn) {
    detail = `Cairan masuk ${degC(c.inletC)}, keluar ${degC(c.outletC)}; sel ${degC(c.cellC)}.`;
  } else if (router.mode === 'A') {
    detail = `Cairan diam; kolektor ${degC(c.cellC)}, dasar tangki ${degC(tank.bottomC)}.`;
  } else {
    detail = `Cairan diam; tangki atas ${degC(tank.topC)}, terisi ${Math.round(tank.soc * 100)} %.`;
  }
  if (!router.pumpOn && dhw.backupW > 0) detail += ' Pemanas cadangan menutup sisa kebutuhan.';
  return {
    key: `${router.mode}|${router.reason}`,
    mode: router.mode,
    reason: router.reason,
    tone: router.pumpOn && c.qLiquidW > 0 ? 'heat' : 'neutral',
    pill: LABELS.mode[router.mode],
    headline: LABELS.reason[router.reason],
    detail,
  };
}

const SINK_ORDER: readonly Sink[] = ['dhw', 'tank', 'desiccant', 'bypass'];

/**
 * Router allocation as whole-number shares that sum to exactly 100 (largest remainder), or null when nothing is
 * allocated (pump off). Input is the allocation in W_th; the shares are for display only.
 */
export function splitShares(alloc: Record<Sink, number>): Record<Sink, number> | null {
  const total = SINK_ORDER.reduce((s, k) => s + Math.max(0, alloc[k]), 0);
  if (total < 1) return null;
  const raw = SINK_ORDER.map((k) => ({ k, v: (Math.max(0, alloc[k]) / total) * 100 }));
  const floors = raw.map((r) => Math.floor(r.v));
  let rest = 100 - floors.reduce((a, b) => a + b, 0);
  const order = raw.map((r, i) => ({ i, f: r.v - floors[i]! })).sort((a, b) => b.f - a.f);
  for (const o of order) {
    if (rest <= 0) break;
    floors[o.i]!++;
    rest--;
  }
  return Object.fromEntries(raw.map((r, i) => [r.k, floors[i]])) as Record<Sink, number>;
}

export { SINK_ORDER };
