/**
 * Flow packets: small dots that travel along the diagram's flows.
 *
 * - The pool is fixed (≤ 60 circles); each frame only `transform` and `opacity` change, and nothing is read back
 *   from the DOM: every flow is a PRE-SPLIT polyline "track" (x, y0, dy per sample). Static flows are sampled once
 *   from their <path>; the four router branches are sampled analytically at slab offset 0 and 1, so a packet's
 *   y = y0 + yc·dy follows the band wherever the valve fractions move its slab.
 * - A packet's position is a pure function of time and its stream, so streams need no per-packet state.
 * - The loop runs only while started (section in view, motion allowed; rAF itself pauses in hidden tabs).
 * - Packets exist only on streams the model computes: the caller passes a stream only when its flow > 0.
 */
export const MAX_PACKETS = 60;
const STEP = 4;

export interface PacketStream {
  /** Track id. */
  id: string;
  count: number;
  /** Speed along the track [diagram px/s]. */
  speed: number;
  fill: string;
  r: number;
  opacity: number;
  /** Slab centre for branch tracks. */
  yc?: number;
}

/** Scale counts down so that the total stays within the pool. */
export function budget(streams: PacketStream[], max = MAX_PACKETS): PacketStream[] {
  const total = streams.reduce((s, x) => s + x.count, 0);
  if (total <= max) return streams;
  const k = max / total;
  return streams.map((s) => ({ ...s, count: s.count > 0 ? Math.max(1, Math.floor(s.count * k)) : 0 }));
}

export interface Track {
  len: number;
  n: number;
  xs: Float32Array;
  y0: Float32Array;
  dy: Float32Array;
}

/** Sample a static <path> once (dy = 0). */
export function trackFromPath(el: SVGPathElement): Track {
  const len = el.getTotalLength();
  const n = Math.max(2, Math.ceil(len / STEP) + 1);
  const xs = new Float32Array(n);
  const y0 = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const p = el.getPointAtLength((len * i) / (n - 1));
    xs[i] = p.x;
    y0[i] = p.y;
  }
  return { len, n, xs, y0, dy: new Float32Array(n) };
}

/** Track from two polylines of the same length of samples (slab offset 0 and 1): y = y0 + yc·dy. */
export function trackFromPair(a: Array<[number, number]>, b: Array<[number, number]>, ref: Array<[number, number]>): Track {
  // arc length from the reference polyline, resampled to uniform steps
  const cum: number[] = [0];
  for (let i = 1; i < ref.length; i++) {
    const p = ref[i - 1] as [number, number];
    const q = ref[i] as [number, number];
    cum.push((cum[i - 1] as number) + Math.hypot(q[0] - p[0], q[1] - p[1]));
  }
  const len = cum[cum.length - 1] as number;
  const n = Math.max(2, Math.ceil(len / STEP) + 1);
  const xs = new Float32Array(n);
  const y0 = new Float32Array(n);
  const dy = new Float32Array(n);
  let j = 0;
  for (let i = 0; i < n; i++) {
    const s = (len * i) / (n - 1);
    while (j < cum.length - 2 && (cum[j + 1] as number) < s) j++;
    const span = (cum[j + 1] as number) - (cum[j] as number);
    const f = span > 0 ? (s - (cum[j] as number)) / span : 0;
    const lerp = (arr: Array<[number, number]>, k: 0 | 1) => (arr[j] as [number, number])[k] + ((arr[j + 1] as [number, number])[k] - (arr[j] as [number, number])[k]) * f;
    xs[i] = lerp(a, 0);
    const ya = lerp(a, 1);
    y0[i] = ya;
    dy[i] = lerp(b, 1) - ya;
  }
  return { len, n, xs, y0, dy };
}

export interface PacketLoop {
  start(): void;
  stop(): void;
}

/** Imperative packet loop over `pool`'s children. `streams()` is read every frame (no React involved). */
export function createPacketLoop(pool: SVGGElement, tracks: Map<string, Track>, streams: () => PacketStream[]): PacketLoop {
  const dots = Array.from(pool.children) as SVGCircleElement[];
  const shown = new Array<number>(dots.length).fill(0);
  let raf = 0;
  let last = 0;
  let clock = 0;

  const hide = (from: number): void => {
    for (let i = from; i < dots.length; i++) {
      if (shown[i] !== 0) {
        (dots[i] as SVGCircleElement).style.opacity = '0';
        shown[i] = 0;
      }
    }
  };
  const loop = (now: number): void => {
    const dt = Math.min(0.05, Math.max(0, (now - last) / 1000));
    last = now;
    clock += dt;
    let k = 0;
    for (const s of streams()) {
      if (s.count <= 0 || s.opacity <= 0) continue;
      const tr = tracks.get(s.id);
      if (!tr) continue;
      const yc = s.yc ?? 0;
      for (let j = 0; j < s.count && k < dots.length; j++, k++) {
        const u = (j / s.count + (clock * s.speed) / tr.len) % 1;
        const f = u * (tr.n - 1);
        const i = Math.min(tr.n - 2, Math.floor(f));
        const t = f - i;
        const x = (tr.xs[i] as number) + ((tr.xs[i + 1] as number) - (tr.xs[i] as number)) * t;
        const y0 = (tr.y0[i] as number) + ((tr.y0[i + 1] as number) - (tr.y0[i] as number)) * t;
        const dy = (tr.dy[i] as number) + ((tr.dy[i + 1] as number) - (tr.dy[i] as number)) * t;
        const dot = dots[k] as SVGCircleElement;
        dot.setAttribute('transform', `translate(${x.toFixed(1)} ${(y0 + yc * dy).toFixed(1)})`);
        dot.setAttribute('r', String(s.r));
        dot.setAttribute('fill', s.fill);
        const edge = Math.min(u, 1 - u) * tr.len;
        const op = s.opacity * Math.min(1, edge / 10);
        dot.style.opacity = String(op);
        shown[k] = op || 1e-6;
      }
    }
    hide(k);
    raf = requestAnimationFrame(loop);
  };
  return {
    start() {
      if (raf) return;
      last = performance.now();
      raf = requestAnimationFrame(loop);
    },
    stop() {
      cancelAnimationFrame(raf);
      raf = 0;
      hide(0);
    },
  };
}
