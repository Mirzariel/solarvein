import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useReducedMotion } from '../../hooks';
import { EASE_UI_CSS } from '../../motion';
import { useStep } from '../../state/systemSelectors';
import { StatusDot } from '../../ui';
import { describeStep, type Statement as StatementData } from './regime';

interface Layer {
  id: number;
  data: StatementData;
  leaving: boolean;
}

/** Fades in on mount (130 ms after the old one left) and out when `leaving` (90 ms); reduced motion: opacity only, shorter. */
function FadeLayer({ leaving, first, children }: { leaving: boolean; first: boolean; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  useEffect(() => {
    const el = ref.current;
    if (!el || !el.animate) return;
    if (leaving) {
      el.animate([{ opacity: 1 }, { opacity: 0 }], { duration: reduced ? 60 : 90, easing: 'linear', fill: 'forwards' });
    } else if (!first) {
      el.animate([{ opacity: 0 }, { opacity: 1 }], { duration: reduced ? 60 : 130, delay: reduced ? 60 : 90, easing: EASE_UI_CSS, fill: 'both' });
    }
  }, [leaving, first, reduced]);
  return (
    <div ref={ref} className="col-start-1 row-start-1" aria-hidden={leaving ? true : undefined}>
      {children}
    </div>
  );
}

/**
 * THE statement: the computed router mode with a 6 px dot, one sentence (the router's reason) and one detail line.
 * It is keyed by `${mode}|${reason}` of the current DayStep, so it changes when the controller's state changes and
 * not when a number does; a change swaps two stacked layers (old out 90 ms, then new in 130 ms, never two at once).
 * Numbers in the detail line follow the live step. Space for three lines is reserved, nothing below shifts.
 */
export function Statement({ className, tone = 'stage' }: { className?: string; tone?: 'stage' | 'page' }) {
  const live = describeStep(useStep());
  const [layers, setLayers] = useState<Layer[]>(() => [{ id: 0, data: live, leaving: false }]);
  const nextId = useRef(1);
  const liveRef = useRef(live);
  liveRef.current = live;

  useEffect(() => {
    setLayers((cur) => {
      const top = cur[cur.length - 1];
      if (top && !top.leaving && top.data.key === live.key) return cur;
      return [...cur.map((l) => ({ ...l, leaving: true })), { id: nextId.current++, data: liveRef.current, leaving: false }];
    });
  }, [live.key]);

  useEffect(() => {
    if (!layers.some((l) => l.leaving)) return;
    const id = window.setTimeout(() => setLayers((cur) => cur.filter((l) => !l.leaving)), 240);
    return () => window.clearTimeout(id);
  }, [layers]);

  return (
    <div className={className}>
      <div className="grid min-h-[8.5rem] lg:min-h-[7.5rem]">
        {layers.map((l, i) => {
          const isTop = i === layers.length - 1 && !l.leaving;
          const data = isTop && live.key === l.data.key ? live : l.data;
          return (
            <FadeLayer key={l.id} leaving={l.leaving} first={l.id === 0}>
              <div data-statement={data.key}>
                <StatusDot tone={data.tone} surface={tone}>
                  {data.pill}
                </StatusDot>
                <p className={`mt-2 text-h3 text-balance ${tone === 'stage' ? 'text-stage-ink' : 'text-ink'}`}>{data.headline}</p>
                <p className={`mt-1 text-small text-pretty ${tone === 'stage' ? 'text-stage-ink-2' : 'text-ink-2'}`}>{data.detail}</p>
              </div>
            </FadeLayer>
          );
        })}
      </div>
    </div>
  );
}
