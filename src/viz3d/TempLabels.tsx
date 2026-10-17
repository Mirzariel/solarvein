/**
 * Router outlet cue (v2): the "Keluar NN °C" label is the visual source of the router diagram. Its root carries
 * `data-stage-cue="outlet"` (and the inlet one `data-stage-cue="inlet"`), so a section can read
 * `document.querySelector('[data-stage-cue="outlet"]')?.getBoundingClientRect()` and start its SVG hand-off from the
 * label's right end. The number is the live `result.outletC`; with the pump off it reads "pompa mati" (no stagnant
 * outlet temperature is presented as a reading). In the 'hotel' framing the inlet label is hidden (restraint: the
 * outlet cue only).
 *
 * Experience stage: Masuk / Keluar temperature annotations (mono, 1 px leader lines, 4 px anchor dot) pinned to the inlet and
 * outlet stubs (docs/audit/05-creative-direction.md 5.6). Positions are written from the projection sink each
 * rendered frame (no React render per frame); the numbers re-render only when the sim result changes.
 */
import { useEffect, useRef } from 'react';
import { useVisualSelect } from '../motion';
import { INK, SVG_BG, SVG_INK, SVG_INK2 } from './chrome';
import { r2, setAttrC, setStyleC } from './domWrite';
import { formatId } from './fmt';
import { useStage, type ProjectedAnchor } from './stage';

interface LabelDef {
  id: 'inlet' | 'outlet';
  symbol: string;
  /** Elbow offset from the anchor [px]. */
  dx: number;
  dy: number;
}

const DEFS: readonly LabelDef[] = [
  { id: 'inlet', symbol: 'Masuk', dx: 22, dy: -70 },
  { id: 'outlet', symbol: 'Keluar', dx: 24, dy: -36 },
];
const RUN = 16;

export function TempLabels() {
  const stage = useStage();
  // the numbers follow the weather engine's visual frame (<= 15 Hz, re-render only when the 0.1 °C text changes)
  const vals = useVisualSelect(
    (f) => [Math.round(f.result.inletC * 10) / 10, Math.round(f.result.outletC * 10) / 10, f.result.pumpOn] as const,
    15,
    (a, b) => a[0] === b[0] && a[1] === b[1] && a[2] === b[2],
  );
  const labels = useRef<(HTMLDivElement | null)[]>([]);
  const lines = useRef<(SVGPolylineElement | null)[]>([]);
  const dots = useRef<(SVGGElement | null)[]>([]);
  const widths = useRef<number[]>([0, 0]);
  const values = vals;

  useEffect(() => {
    widths.current = labels.current.map((el) => el?.offsetWidth ?? 0);
  }, [vals]);

  useEffect(() => {
    const sink = (pts: readonly ProjectedAnchor[], W: number, H: number): void => {
      DEFS.forEach((d, i) => {
        const p = pts.find((q) => q.id === d.id);
        const el = labels.current[i];
        const ln = lines.current[i];
        const dot = dots.current[i];
        if (!p || !el || !ln || !dot) return;
        const hotelView = stage.store.getState().framing > 0.5;
        const show = p.visible && W >= 320 && !(hotelView && d.id === 'inlet');
        const vis = show ? 'visible' : 'hidden';
        setStyleC(el, 'visibility', vis);
        setStyleC(ln as unknown as HTMLElement, 'visibility', vis);
        setStyleC(dot as unknown as HTMLElement, 'visibility', vis);
        if (!show) return;
        const w = widths.current[i] || el.offsetWidth;
        if (W < 520) {
          // narrow stage: no leader lines; the two readings stack in the top-left corner, the dots mark the ports
          setStyleC(ln as unknown as HTMLElement, 'visibility', 'hidden');
          setAttrC(dot, 'transform', `translate(${r2(p.x)} ${r2(p.y)})`);
          setStyleC(el, 'transform', `translate3d(14px, ${i === 0 ? 14 : 34}px, 0)`);
          return;
        }
        const o = d;
        let side = 1;
        let ex = p.x + o.dx;
        if (ex + RUN + 6 + w > W - 10) {
          side = -1;
          ex = p.x - o.dx;
        }
        const x2 = ex + side * RUN;
        const lx = side === 1 ? x2 + 6 : x2 - 6 - w;
        // keep the label inside the stage (above the bottom edge) and clear of the zoom/reset buttons,
        // which occupy the top-right corner (~150 x 64 px)
        const underToolbar = lx + w > W - 150;
        const ey = Math.max(underToolbar ? 76 : 22, Math.min(H - 22, p.y + o.dy));
        setAttrC(ln, 'points', `${r2(p.x)},${r2(p.y)} ${r2(ex)},${r2(ey)} ${r2(x2)},${r2(ey)}`);
        setAttrC(dot, 'transform', `translate(${r2(p.x)} ${r2(p.y)})`);
        setStyleC(el, 'transform', `translate3d(${r2(lx)}px, ${r2(ey - 12)}px, 0)`);
      });
    };
    stage.projection.current = sink;
    stage.wake.current?.();
    return () => {
      if (stage.projection.current === sink) stage.projection.current = null;
    };
  }, [stage.projection, stage.wake]);

  return (
    <div className="pointer-events-none absolute inset-0 z-10 overflow-hidden" aria-hidden="true">
      <svg className="absolute inset-0 h-full w-full overflow-visible">
        {DEFS.map((d, i) => (
          <g key={d.id}>
            <polyline
              ref={(el) => {
                lines.current[i] = el;
              }}
              fill="none"
              style={{ stroke: SVG_INK2, strokeOpacity: 0.7, visibility: 'hidden' }}
              strokeWidth={1}
            />
            <g
              ref={(el) => {
                dots.current[i] = el;
              }}
              style={{ visibility: 'hidden' }}
            >
              <circle r={4} style={{ fill: SVG_INK, stroke: SVG_BG }} strokeWidth={1.5} />
            </g>
          </g>
        ))}
      </svg>
      {DEFS.map((d, i) => (
        <div
          key={d.id}
          ref={(el) => {
            labels.current[i] = el;
          }}
          data-stage-cue={d.id}
          className="absolute left-0 top-0 whitespace-nowrap rounded-md bg-[color:rgba(14,17,20,0.78)] px-2 py-1 font-mono text-xs leading-4"
          style={{ visibility: 'hidden' }}
        >
          <span className={INK}>{d.symbol} </span>
          {i === 1 && !values[2] ? (
            <span className={INK}>pompa mati</span>
          ) : (
            <>
              <span className={`${INK} font-medium`}>{formatId((values[i] as number) ?? 0, 1)}</span>
              <span className={INK}> °C</span>
            </>
          )}
        </div>
      ))}
    </div>
  );
}
