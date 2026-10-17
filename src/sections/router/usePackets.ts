/**
 * Flow packets: small dots that travel along the diagram's own <path> elements.
 *
 * - The pool is fixed (≤ 60 circles); each frame only `transform` and `opacity` change.
 * - A packet's position is a pure function of time and its stream, so streams need no per-packet state.
 * - The loop runs only while `active` (section in view, motion allowed, tab visible via rAF).
 * - Packets exist only on streams the model computes: the caller passes a stream only when its flow > 0.
 */
import { useEffect, useRef, type RefObject } from 'react';

export const MAX_PACKETS = 60;

export interface PacketStream {
  /** Matches `data-flow="…"` on a path in the SVG. */
  id: string;
  count: number;
  /** Speed along the path [diagram px/s]. */
  speed: number;
  fill: string;
  r: number;
  opacity: number;
}

/** Scale counts down so that the total stays within the pool. */
export function budget(streams: PacketStream[], max = MAX_PACKETS): PacketStream[] {
  const total = streams.reduce((s, x) => s + x.count, 0);
  if (total <= max) return streams;
  const k = max / total;
  return streams.map((s) => ({ ...s, count: s.count > 0 ? Math.max(1, Math.floor(s.count * k)) : 0 }));
}

export function usePackets(svg: RefObject<SVGSVGElement | null>, pool: RefObject<SVGGElement | null>, streams: PacketStream[], active: boolean): void {
  const streamsRef = useRef<PacketStream[]>(streams);
  streamsRef.current = streams;

  useEffect(() => {
    const root = pool.current;
    const owner = svg.current;
    if (!root || !owner) return;
    const dots = Array.from(root.children) as SVGCircleElement[];
    const hide = (from: number): void => {
      for (let i = from; i < dots.length; i++) {
        const d = dots[i] as SVGCircleElement;
        if (d.style.opacity !== '0') d.style.opacity = '0';
      }
    };
    if (!active) {
      hide(0);
      return;
    }
    const cache = new Map<string, { el: SVGPathElement | null; d: string; len: number }>();
    const lookup = (id: string) => {
      let c = cache.get(id);
      if (!c || !c.el?.isConnected) {
        c = { el: owner.querySelector<SVGPathElement>(`[data-flow="${id}"]`), d: '', len: 0 };
        cache.set(id, c);
      }
      if (c.el) {
        const d = c.el.getAttribute('d') ?? '';
        if (d !== c.d) {
          c.d = d;
          c.len = c.el.getTotalLength();
        }
      }
      return c;
    };
    let raf = 0;
    let last = performance.now();
    let clock = 0;
    const loop = (now: number): void => {
      const dt = Math.min(0.05, Math.max(0, (now - last) / 1000));
      last = now;
      clock += dt;
      let k = 0;
      for (const s of streamsRef.current) {
        if (s.count <= 0 || s.opacity <= 0) continue;
        const c = lookup(s.id);
        if (!c.el || c.len < 4) continue;
        for (let j = 0; j < s.count && k < dots.length; j++, k++) {
          const u = (j / s.count + (clock * s.speed) / c.len) % 1;
          const p = c.el.getPointAtLength(u * c.len);
          const dot = dots[k] as SVGCircleElement;
          dot.setAttribute('transform', `translate(${p.x.toFixed(1)} ${p.y.toFixed(1)})`);
          dot.setAttribute('r', String(s.r));
          dot.setAttribute('fill', s.fill);
          // fade at both ends so packets appear/disappear inside the band, not on its edge
          const edge = Math.min(u, 1 - u) * c.len;
          dot.style.opacity = String(s.opacity * Math.min(1, edge / 10));
        }
      }
      hide(k);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      hide(0);
    };
  }, [active, svg, pool]);
}
