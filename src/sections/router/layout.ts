/**
 * Router diagram geometry (pure). One coordinate system, viewBox 1280 × 545 (the page grid is 1280 wide, so the
 * SVG spans the whole content column), left → right: sources (collector, outside air) · router and conversion ·
 * hotel services (hot water, supply air, electricity). Three lanes that never overlap: thermal (top), air (middle),
 * electrical (bottom).
 *
 * Conservation is geometric: the four branch bands start as slabs that TILE the trunk's cross-section at the
 * router, so their widths always sum to the trunk width (W_TOT when the pump runs).
 */
import type { Sink } from '../../sim/system';

export const SINK_ORDER: readonly Sink[] = ['bypass', 'dhw', 'tank', 'desiccant'];

export const VB = { w: 1280, h: 545 } as const;
/** Trunk width when the pump runs [px]. Branch width = valve fraction × W_TOT. */
export const W_TOT = 24;
export const TRUNK_Y = 225;
export const ROUTER = { x: 300, y: 225, r: 18 } as const;

export const COLLECTOR = { x: 0, y: 150, w: 150, h: 150 } as const;
export const DRY = { x: 560, y: 8, w: 156, h: 46 } as const;
export const BYPASS_Y = 31;
export const DHW_Y = 82;
export const DIS_Y = 124;
export const HX_DHW = { x: 800, y: 62, w: 84, h: 86 } as const;
export const OUT = { x0: 884, x1: 1086, yc: 103 } as const;
export const TANK = { x: 520, y: 165, w: 100, h: 140 } as const;
export const HEATPUMP = { x: 700, y: 262, w: 96, h: 40 } as const;
export const HX_REGEN = { x: 385, y: 366, w: 70, h: 30 } as const;
export const BED = { x: 540, y: 356, w: 120, h: 98, split: 405 } as const;
export const AFTER = { x: 720, y: 412, w: 64, h: 32 } as const;
export const COIL = { x: 720, y: 459, w: 64, h: 32 } as const;
export const ROW = { regen: 381, proc: 428, coil: 475 } as const;
export const E_Y = 520;
export const COL_X = 1104;

export interface Valves {
  bypass: number;
  dhw: number;
  tank: number;
  desiccant: number;
}

/** Slab centres and widths of the branches at the router (stack centred on the trunk axis). */
export function slabs(valves: Valves): Record<Sink, { yc: number; w: number }> {
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
      return `M${x0},${y} C365,${y} 365,${BYPASS_Y} 430,${BYPASS_Y} H${DRY.x}`;
    case 'dhw':
      return `M${x0},${y} C365,${y} 365,${DHW_Y} 430,${DHW_Y} H${HX_DHW.x}`;
    case 'tank':
      return `M${x0},${y} C365,${y} 365,${TRUNK_Y} 430,${TRUNK_Y} H${TANK.x}`;
    case 'desiccant':
      return `M${x0},${y} C350,${y} 420,${r1(yc + 10)} 420,${r1(yc + 72)} V${HX_REGEN.y}`;
  }
}

export const PATHS = {
  trunk: `M${COLLECTOR.x + COLLECTOR.w},${TRUNK_Y} H${ROUTER.x}`,
  discharge: `M${TANK.x + TANK.w / 2},${TANK.y + 2} V${DIS_Y + 14} Q${TANK.x + TANK.w / 2},${DIS_Y} ${TANK.x + TANK.w / 2 + 16},${DIS_Y} H${HX_DHW.x}`,
  hpIn: `M60,${COLLECTOR.y + COLLECTOR.h} V332 H748 V${HEATPUMP.y + HEATPUMP.h}`,
  hpOut: `M${HEATPUMP.x},${HEATPUMP.y + 20} H${TANK.x + TANK.w}`,
  elec: `M30,${COLLECTOR.y + COLLECTOR.h} V${E_Y} H${OUT.x1}`,
  mains: `M842,32 V${HX_DHW.y}`,
  // air lane
  feed: `M300,${ROW.proc} H${BED.x}`,
  procOut: `M${BED.x + BED.w},${ROW.proc} H${AFTER.x}`,
  coilRow: `M325,${ROW.proc} V${ROW.coil} H${COIL.x}`,
  coilOut: `M${COIL.x + COIL.w},${ROW.coil} H830 V${ROW.proc}`,
  supply: `M${AFTER.x + AFTER.w},${ROW.proc} H${OUT.x1}`,
  regenIn: `M300,${ROW.regen} H${HX_REGEN.x}`,
  regenMid: `M${HX_REGEN.x + HX_REGEN.w},${ROW.regen} H${BED.x}`,
  exhaust: `M${BED.x + BED.w},${ROW.regen} H840`,
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
export function outputStrips(directW: number, tankW: number, demandW: number) {
  if (demandW <= 1) return { direct: 0, tank: 0, backup: 0 };
  const d = Math.min(1, Math.max(0, directW / demandW));
  const t = Math.min(1 - d, Math.max(0, tankW / demandW));
  const b = Math.max(0, 1 - d - t);
  return { direct: d * W_TOT, tank: t * W_TOT, backup: b * W_TOT };
}

type Pt = [number, number];
const cubic = (p0: Pt, p1: Pt, p2: Pt, p3: Pt, n: number): Pt[] => {
  const out: Pt[] = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const u = 1 - t;
    const a = u * u * u;
    const b = 3 * u * u * t;
    const c = 3 * u * t * t;
    const d = t * t * t;
    out.push([a * p0[0] + b * p1[0] + c * p2[0] + d * p3[0], a * p0[1] + b * p1[1] + c * p2[1] + d * p3[1]]);
  }
  return out;
};
const line = (a: Pt, b: Pt, n: number): Pt[] => Array.from({ length: n }, (_, i) => [a[0] + ((b[0] - a[0]) * (i + 1)) / n, a[1] + ((b[1] - a[1]) * (i + 1)) / n] as Pt);

/** The branch centre line as a fixed-count polyline (same count for every yc): y is linear in yc, which the packet tracks rely on. */
export function branchPoints(sink: Sink, yc: number): Pt[] {
  const x0 = ROUTER.x;
  switch (sink) {
    case 'bypass':
      return [...cubic([x0, yc], [365, yc], [365, BYPASS_Y], [430, BYPASS_Y], 24), ...line([430, BYPASS_Y], [DRY.x, BYPASS_Y], 16)];
    case 'dhw':
      return [...cubic([x0, yc], [365, yc], [365, DHW_Y], [430, DHW_Y], 24), ...line([430, DHW_Y], [HX_DHW.x, DHW_Y], 40)];
    case 'tank':
      return [...cubic([x0, yc], [365, yc], [365, TRUNK_Y], [430, TRUNK_Y], 24), ...line([430, TRUNK_Y], [TANK.x, TRUNK_Y], 10)];
    case 'desiccant':
      return [...cubic([x0, yc], [350, yc], [420, yc + 10], [420, yc + 72], 24), ...line([420, yc + 72], [420, HX_REGEN.y], 12)];
  }
}
