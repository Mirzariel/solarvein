/**
 * Inspect stage: four clickable annotations (Sel PV & kaca, Pelat absorber, Saluran cairan, Insulasi & rangka).
 *
 *  - Each is a real <button> (tab order 1..4) with a 1 px leader line and a 4 px anchor dot pinned to its 3D
 *    anchor. Positions are written from the projection sink every rendered frame - no React render per frame.
 *  - Labels sit in a right-hand column, de-overlapped, with a 16 px horizontal run after the elbow.
 *  - Selecting a part dims the others (3D + annotations) and expands its label with ONE sentence and ONE live
 *    value from the sim (re-rendered only when the sim result changes).
 *  - `compact` (narrow stage): numbered markers only; the page shows the list below the stage.
 */
import { useEffect, useLayoutEffect, useRef } from 'react';
import { useSimResult } from '../state/selectors';
import { INK, INK2, FOCUS_RING, SHADOW_TEXT, SVG_BG, SVG_INK, SVG_INK2 } from './chrome';
import { r2, setAttrC, setStyleC } from './domWrite';
import { PARTS, partValue, type PartId } from './parts';
import { useStage, useStageState, type ProjectedAnchor } from './stage';

const COL_W = 200;
const RUN = 16;
const GAP = 10;

export function PartAnnotations({ compact }: { compact: boolean }) {
  const stage = useStage();
  const result = useSimResult();
  const focus = useStageState(stage.store, (s) => s.focusPart);
  const hover = useStageState(stage.store, (s) => s.hoverPart);
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);
  const lines = useRef<(SVGPolylineElement | null)[]>([]);
  const dots = useRef<(SVGGElement | null)[]>([]);
  const heights = useRef<number[]>(PARTS.map(() => 24));
  const compactRef = useRef(compact);
  compactRef.current = compact;

  // Re-measure label heights when the content changes.
  const valueKey = PARTS.map((p) => partValue(p.id, result).value).join('|');
  useLayoutEffect(() => {
    heights.current = buttons.current.map((b) => b?.offsetHeight ?? 24);
    stage.wake.current?.();
  }, [focus, compact, valueKey, stage.wake]);

  useEffect(() => {
    const sink = (pts: readonly ProjectedAnchor[], W: number, H: number): void => {
      const comp = compactRef.current;
      const anchors = PARTS.map((p) => pts.find((q) => q.id === p.id));
      let maxX = 0;
      anchors.forEach((a) => {
        if (a?.visible) maxX = Math.max(maxX, a.x);
      });
      const colX = Math.max(12, Math.min(W - COL_W - 12, maxX + 56));
      const order = anchors
        .map((a, i) => ({ i, y: a?.y ?? 0 }))
        .sort((p, q) => p.y - q.y)
        .map((o) => o.i);
      const tops: number[] = [];
      let prev = 8;
      for (const i of order) {
        const h = heights.current[i] ?? 24;
        const a = anchors[i];
        const top = Math.max((a?.y ?? 0) - 12, prev);
        tops[i] = top;
        prev = top + h + GAP;
      }
      // keep inside the stage (push up from the bottom)
      let limit = H - 76;
      for (let k = order.length - 1; k >= 0; k--) {
        const i = order[k] as number;
        const h = heights.current[i] ?? 24;
        const t = Math.min(tops[i] ?? 0, limit - h);
        tops[i] = Math.max(8, t);
        limit = (tops[i] ?? 0) - GAP;
      }
      PARTS.forEach((_, i) => {
        const a = anchors[i];
        const b = buttons.current[i];
        const ln = lines.current[i];
        const dot = dots.current[i];
        if (!a || !b || !ln || !dot) return;
        const show = a.visible;
        setStyleC(b, 'visibility', show ? 'visible' : 'hidden');
        setStyleC(dot as unknown as HTMLElement, 'visibility', show ? 'visible' : 'hidden');
        setStyleC(ln as unknown as HTMLElement, 'visibility', show && !comp ? 'visible' : 'hidden');
        if (!show) return;
        setAttrC(dot, 'transform', `translate(${r2(a.x)} ${r2(a.y)})`);
        if (comp) {
          setStyleC(b, 'transform', `translate3d(${r2(a.x + 8)}px, ${r2(a.y - 20)}px, 0)`);
        } else {
          const top = tops[i] ?? 0;
          const cy = top + 12;
          setAttrC(ln, 'points', `${r2(a.x)},${r2(a.y)} ${r2(colX - RUN)},${r2(cy)} ${r2(colX - 4)},${r2(cy)}`);
          setStyleC(b, 'transform', `translate3d(${r2(colX)}px, ${r2(top)}px, 0)`);
        }
      });
    };
    stage.projection.current = sink;
    stage.wake.current?.();
    return () => {
      if (stage.projection.current === sink) stage.projection.current = null;
    };
  }, [stage.projection, stage.wake]);

  const select = (id: PartId) => stage.store.getState().setFocusPart(focus === id ? null : id);

  return (
    <div className="pointer-events-none absolute inset-0 z-10 overflow-hidden">
      <svg className="absolute inset-0 h-full w-full overflow-visible" aria-hidden="true">
        {PARTS.map((p, i) => {
          const sel = focus === p.id;
          const lit = sel || hover === p.id;
          const faded = focus !== null && !sel;
          return (
            <g key={p.id} style={{ opacity: faded ? 0.4 : 1, transition: 'opacity 180ms cubic-bezier(0.22,1,0.36,1)' }}>
              <polyline
                ref={(el) => {
                  lines.current[i] = el;
                }}
                fill="none"
                strokeWidth={1}
                style={{ stroke: lit ? SVG_INK : SVG_INK2, strokeOpacity: lit ? 1 : 0.7, visibility: 'hidden' }}
              />
              <g
                ref={(el) => {
                  dots.current[i] = el;
                }}
                style={{ visibility: 'hidden' }}
              >
                <circle r={lit ? 6 : 4} style={{ fill: SVG_INK, stroke: SVG_BG, transition: 'r 150ms' }} strokeWidth={1.5} />
              </g>
            </g>
          );
        })}
      </svg>
      {PARTS.map((p, i) => {
        const sel = focus === p.id;
        const faded = focus !== null && !sel;
        const v = partValue(p.id, result);
        return (
          <button
            key={p.id}
            ref={(el) => {
              buttons.current[i] = el;
            }}
            type="button"
            aria-pressed={sel}
            aria-label={`${p.index}. ${p.label}${sel ? '' : '. Tekan untuk melihat perannya'}`}
            onClick={() => select(p.id)}
            onPointerEnter={() => stage.store.getState().setHoverPart(p.id)}
            onPointerLeave={() => stage.store.getState().setHoverPart(null)}
            className={`pointer-events-auto absolute left-0 top-0 rounded-md text-left font-mono text-xs leading-4 ${SHADOW_TEXT} ${FOCUS_RING} ${
              compact ? 'flex size-11 items-start justify-start p-0' : 'block p-0'
            }`}
            style={{
              width: compact ? undefined : COL_W,
              visibility: 'hidden',
              opacity: faded ? 0.75 : 1,
              transition: 'opacity 180ms cubic-bezier(0.22,1,0.36,1)',
            }}
          >
            <span className="flex items-baseline gap-2" style={{ minHeight: 24, alignItems: 'center' }}>
              <span className={`${INK} tabular-nums`}>{p.index}</span>
              {compact ? null : <span className={`${INK} font-sans text-[13px] font-medium`}>{p.label}</span>}
            </span>
            {sel && !compact ? (
              <span className="mt-1 block pl-[18px]">
                <span className={`block font-sans text-xs leading-[18px] ${INK2}`}>{p.sentence}</span>
                <span className="mt-1.5 block">
                  <span className={INK2}>{v.symbol} </span>
                  <span className={`${INK} font-medium`}>{v.value}</span>
                  <span className={INK2}> {v.unit}</span>
                </span>
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
