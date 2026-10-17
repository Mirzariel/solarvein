/**
 * Router diagram geometry (pure). One coordinate system, viewBox 1100 × 590, left → right:
 * sources (collector, outside air) · router and conversion · hotel services (hot water, supply air, electricity).
 * Three lanes that never overlap: thermal (top, y 20–395), air (y 405–550), electrical (y 568).
 *
 * Conservation is geometric: the four branch bands start as slabs that TILE the trunk's cross-section at the
 * router, so their widths always sum to the trunk width (W_TOT when the pump runs).
 */
import type { Sink } from '../../sim/system';
import { SINK_ORDER } from './useRouterView';

export const VB = { w: 1100, h: 590 } as const;
/** Trunk width when the pump runs [px]. Branch width = valve fraction × W_TOT. */
export const W_TOT = 24;
export const TRUNK_Y = 250;
export const ROUTER = { x: 268, y: 250, r: 18 } as const;

export const COLLECTOR = { x: 8, y: 170, w: 140, h: 160 } as const;
export const TANK = { x: 430, y: 190, w: 90, h: 140 } as const;
export const HX_DHW = { x: 610, y: 80, w: 80, h: 90 } as const;
export const OUT_BAND = { x0: 690, x1: 868, yc: 125 } as const;
export const HX_REGEN = { x: 320, y: 426, w: 70, h: 30 } as const;
export const BED = { x: 430, y: 418, w: 110, h: 90, split: 463 } as const;
export const AFTERCOOLER = { x: 590, y: 470, w: 60, h: 32 } as const;
export const COIL = { x: 590, y: 515, w: 60, h: 32 } as const;
export const HEATPUMP = { x: 560, y: 352, w: 90, h: 40 } as const;
export const ROW = { regen: 441, proc: 486, coil: 531 } as const;
export const E_Y = 568;

/** Slab centres and widths of the branches at the router (stack centred on the trunk axis). */
export function slabs(valves: Record<Sink, number>): Record<Sink, { yc: number; w: number }> {
  const out = {} as Record<Sink, { yc: number; w: number }>;
  const total = SINK_ORDER.reduce((s, k) => s + Math.max(0, valves[k]), 0) * W_TOT;
  let y = TRUNK_Y - total / 2;
  for (const k of SINK_ORDER) {
    const w = Math.max(0, valves[k]) * W_TOT;
    out[k] = { yc: y + w / 2, w };
    y += w;
  }
  return out;
}

const r1 = (n: number): string => (Math.round(n * 10) / 10).toString();

/** Centre line of a branch, from its slab at the router to its destination. */
export function branchPath(sink: Sink, yc: number): string {
  const x0 = ROUTER.x;
  const y = r1(yc);
  switch (sink) {
    case 'bypass':
      return `M${x0},${y} C330,${y} 330,44 392,44 H470`;
    case 'dhw':
      return `M${x0},${y} C330,${y} 330,105 392,105 H${HX_DHW.x}`;
    case 'tank':
      return `M${x0},${y} C330,${y} 330,${TRUNK_Y} 392,${TRUNK_Y} H${TANK.x}`;
    case 'desiccant':
      return `M${x0},${y} C312,${y} 352,${r1(yc + 8)} 352,${r1(yc + 72)} V${HX_REGEN.y}`;
  }
}

export const PATHS = {
  trunk: `M${COLLECTOR.x + COLLECTOR.w},${TRUNK_Y} H${ROUTER.x}`,
  discharge: `M475,${TANK.y + 2} V166 Q475,150 491,150 H${HX_DHW.x}`,
  hpIn: `M78,${COLLECTOR.y + COLLECTOR.h} V372 H${HEATPUMP.x}`,
  hpOut: `M605,${HEATPUMP.y} V290 H${TANK.x + TANK.w}`,
  elec: `M40,${COLLECTOR.y + COLLECTOR.h} V${E_Y} H868`,
  // air lane
  feed: `M190,${ROW.proc} H${BED.x}`,
  procOut: `M${BED.x + BED.w},${ROW.proc} H${AFTERCOOLER.x}`,
  coilRow: `M215,${ROW.proc} V${ROW.coil} H${COIL.x}`,
  coilOut: `M${COIL.x + COIL.w},${ROW.coil} H700 V${ROW.proc}`,
  supply: `M${AFTERCOOLER.x + AFTERCOOLER.w},${ROW.proc} H868`,
  regenIn: `M190,${ROW.regen} H${HX_REGEN.x}`,
  regenMid: `M${HX_REGEN.x + HX_REGEN.w},${ROW.regen} H${BED.x}`,
  exhaust: `M${BED.x + BED.w},${ROW.regen} H720`,
} as const;

/** Triangular arrowhead at (x, y) for a band of width w. dir: 'r' | 'd' | 'u'. */
export function head(x: number, y: number, dir: 'r' | 'd' | 'u', w: number): string {
  const h = Math.max(3.5, Math.min(11, w * 0.55 + 2.5));
  const a = h * 1.15;
  if (dir === 'r') return `M${r1(x - 1)},${r1(y - h)} L${r1(x + a)},${r1(y)} L${r1(x - 1)},${r1(y + h)} Z`;
  if (dir === 'd') return `M${r1(x - h)},${r1(y - 1)} L${r1(x)},${r1(y + a)} L${r1(x + h)},${r1(y - 1)} Z`;
  return `M${r1(x - h)},${r1(y + 1)} L${r1(x)},${r1(y - a)} L${r1(x + h)},${r1(y + 1)} Z`;
}

/** Output band strips (top → bottom): direct, from tank, existing heater. Heights sum to W_TOT when there is demand. */
export function outputStrips(directW: number, tankW: number, _backupW: number, demandW: number) {
  if (demandW <= 1) return { direct: 0, tank: 0, backup: 0 };
  const d = Math.min(1, Math.max(0, directW / demandW));
  const t = Math.min(1 - d, Math.max(0, tankW / demandW));
  const b = Math.max(0, 1 - d - t);
  return { direct: d * W_TOT, tank: t * W_TOT, backup: b * W_TOT };
}
