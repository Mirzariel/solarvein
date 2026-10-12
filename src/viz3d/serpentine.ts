/**
 * Serpentine channel geometry helpers (pure; shared with src/viz3d/effects).
 *
 * The centre line is ANALYTIC (straight passes joined by exact semicircular bends of radius
 * spacing/2), parametrised by arc length, so there are no kinks and no Catmull-Rom wobble.
 *
 * Layout (panel centred at the origin, XZ plane, +Y = sun side):
 *  - SERPENTINE_PASSES straight passes run along Z, spread along X inside SERPENTINE_MARGIN.
 *  - Neighbouring passes are joined by semicircular bends.
 *  - Liquid ENTERS at INLET_POSITION (-Z end, -X side) and LEAVES at OUTLET_POSITION
 *    (-Z end, +X side). Direction is fixed: inlet -> outlet, whatever the heat regime.
 *  - All points are at the ASSEMBLED channel-layer height. In the exploded view the whole channel
 *    layer is translated by `layerY('channel', f) - layerY('channel', 0)`.
 *
 * `u` everywhere = arc-length fraction 0 (inlet tip) .. 1 (outlet tip).
 */
import * as THREE from 'three';
import {
  LAYERS,
  PANEL_LENGTH,
  PANEL_WIDTH,
  SERPENTINE_MARGIN,
  SERPENTINE_PASSES,
  type LayerId,
} from './dims';

/** How far the inlet/outlet stubs extend beyond the panel edge [scene units]. */
export const STUB_LENGTH = 0.2;

const CHANNEL_SPEC = LAYERS.find((l) => l.id === 'channel');
/** Assembled centre Y of the channel layer (tube centre line). */
export const CHANNEL_Y = CHANNEL_SPEC ? CHANNEL_SPEC.y : 0.05;

/** Current centre Y of a layer for an explode factor 0 (assembled) .. 1 (fully exploded). */
export function layerY(id: LayerId, explodedFactor: number): number {
  const spec = LAYERS.find((l) => l.id === id);
  if (!spec) return 0;
  return spec.y + spec.explodeOffset * explodedFactor;
}

interface Seg {
  kind: 'line' | 'arc';
  /** Cumulative arc length at segment start. */
  s0: number;
  len: number;
  /** line: start (x, z) and unit direction (dx, dz). arc: centre (x, z), radius, start angle, signed sweep, sgn. */
  a: number;
  b: number;
  c: number;
  d: number;
  e: number;
  f: number;
}

interface PathData {
  segs: Seg[];
  length: number;
  heatedStart: number;
  heatedEnd: number;
  /** Radius of the bends. */
  bendRadius: number;
  /** X of each pass. */
  passX: number[];
  zMax: number;
}

let cache: PathData | null = null;

function build(): PathData {
  const halfL = PANEL_LENGTH / 2;
  const x0 = -PANEL_WIDTH / 2 + SERPENTINE_MARGIN;
  const x1 = PANEL_WIDTH / 2 - SERPENTINE_MARGIN;
  const spacing = (x1 - x0) / (SERPENTINE_PASSES - 1);
  const r = spacing / 2;
  const zMax = halfL - SERPENTINE_MARGIN - r;
  const zTip = -halfL - STUB_LENGTH;

  const segs: Seg[] = [];
  const passX: number[] = [];
  let s = 0;
  const line = (x: number, za: number, zb: number) => {
    const len = Math.abs(zb - za);
    segs.push({ kind: 'line', s0: s, len, a: x, b: za, c: 0, d: Math.sign(zb - za), e: 0, f: 0 });
    s += len;
  };
  const arc = (cx: number, cz: number, sgn: number) => {
    const len = Math.PI * r;
    // point(phi) = (cx - r cos phi, cz + sgn r sin phi), phi 0..PI
    segs.push({ kind: 'arc', s0: s, len, a: cx, b: cz, c: r, d: sgn, e: 0, f: 0 });
    s += len;
  };

  for (let i = 0; i < SERPENTINE_PASSES; i++) {
    const x = x0 + i * spacing;
    passX.push(x);
    const forward = i % 2 === 0; // even passes run -Z -> +Z
    const first = i === 0;
    const last = i === SERPENTINE_PASSES - 1;
    if (forward) line(x, first ? zTip : -zMax, zMax);
    else line(x, zMax, last ? zTip : -zMax);
    if (!last) arc(x + r, forward ? zMax : -zMax, forward ? 1 : -1);
  }

  return {
    segs,
    length: s,
    heatedStart: STUB_LENGTH / s,
    heatedEnd: 1 - STUB_LENGTH / s,
    bendRadius: r,
    passX,
    zMax,
  };
}

function data(): PathData {
  if (!cache) cache = build();
  return cache;
}

function findSeg(d: PathData, s: number): Seg {
  const segs = d.segs;
  let lo = 0;
  let hi = segs.length - 1;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if ((segs[mid] as Seg).s0 <= s) lo = mid;
    else hi = mid - 1;
  }
  return segs[lo] as Seg;
}

/** Centre-line point at arc-length fraction `u` (allocation-free when `out` is supplied). */
export function pointAt(u: number, out: THREE.Vector3): THREE.Vector3 {
  const d = data();
  const s = Math.min(Math.max(u, 0), 1) * d.length;
  const g = findSeg(d, s);
  const k = Math.min(Math.max(s - g.s0, 0), g.len);
  if (g.kind === 'line') return out.set(g.a, CHANNEL_Y, g.b + g.d * k);
  const phi = k / g.c; // radius = c
  return out.set(g.a - g.c * Math.cos(phi), CHANNEL_Y, g.b + g.d * g.c * Math.sin(phi));
}

/** Unit tangent (inlet -> outlet direction) at `u`. */
export function tangentAt(u: number, out: THREE.Vector3): THREE.Vector3 {
  const d = data();
  const s = Math.min(Math.max(u, 0), 1) * d.length;
  const g = findSeg(d, s);
  if (g.kind === 'line') return out.set(0, 0, g.d);
  const phi = Math.min(Math.max(s - g.s0, 0), g.len) / g.c;
  return out.set(Math.sin(phi), 0, g.d * Math.cos(phi));
}

/** Total centre-line length of the channel including both stubs [scene units]. */
export function getSerpentineLength(): number {
  return data().length;
}

/** Arc-length fractions (0..1) at which the heated serpentine begins/ends (outside = stubs). */
export function getHeatedRange(): { start: number; end: number } {
  const d = data();
  return { start: d.heatedStart, end: d.heatedEnd };
}

export function getBendRadius(): number {
  return data().bendRadius;
}

/** X of each straight pass and the |z| at which bends start. */
export function getPassLayout(): { passX: readonly number[]; zMax: number } {
  const d = data();
  return { passX: d.passX, zMax: d.zMax };
}

/**
 * Arc-length samples that resolve the geometry well: segment ends, mid points on long straights and
 * `arcSteps` points per bend (so bends are smooth without oversampling the straights).
 */
export function getAdaptiveSamples(arcSteps = 18, lineStep = 0.45): number[] {
  const d = data();
  const out: number[] = [];
  for (const g of d.segs) {
    const n = g.kind === 'arc' ? arcSteps : Math.max(1, Math.ceil(g.len / lineStep));
    for (let k = 0; k < n; k++) out.push((g.s0 + (g.len * k) / n) / d.length);
  }
  out.push(1);
  return out;
}

/** Polyline inlet -> outlet (fresh clones). */
export function getSerpentinePoints(): THREE.Vector3[] {
  return getAdaptiveSamples(14, 0.3).map((u) => pointAt(u, new THREE.Vector3()));
}

export interface SerpentineLUT {
  /** Number of samples (segments + 1). */
  count: number;
  /** xyz triplets, uniform arc length, inlet -> outlet. */
  positions: Float32Array;
  /** Unit tangents (xyz), inlet -> outlet. */
  tangents: Float32Array;
}

const lutCache = new Map<number, SerpentineLUT>();

/** Precomputed arc-length lookup table for allocation-free per-frame sampling. */
export function getSerpentineLUT(segments = 1200): SerpentineLUT {
  const hit = lutCache.get(segments);
  if (hit) return hit;
  const count = segments + 1;
  const positions = new Float32Array(count * 3);
  const tangents = new Float32Array(count * 3);
  const p = new THREE.Vector3();
  const t = new THREE.Vector3();
  for (let i = 0; i < count; i++) {
    const u = i / segments;
    pointAt(u, p);
    tangentAt(u, t);
    positions.set([p.x, p.y, p.z], i * 3);
    tangents.set([t.x, t.y, t.z], i * 3);
  }
  const lut = { count, positions, tangents };
  lutCache.set(segments, lut);
  return lut;
}

/** Free end of the inlet stub (liquid enters here). */
export const INLET_POSITION: THREE.Vector3 = pointAt(0, new THREE.Vector3());

/** Free end of the outlet stub (liquid leaves here). */
export const OUTLET_POSITION: THREE.Vector3 = pointAt(1, new THREE.Vector3());
