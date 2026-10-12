import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useReducedMotion } from '../../hooks';
import { EASE_UI_CSS, useVisualSelect, weather } from '../../motion';
import { StatusDot } from '../../ui';
import { describeRegime, type Statement as StatementData } from './regime';

const eq = (a: StatementData, b: StatementData): boolean => a.key === b.key && a.detail === b.detail && a.headline === b.headline;

/**
 * Statement key follower. Harvest and rejection are adopted at once, in the same frame as the numbers that show them
 * (QA D-04: no sentence that contradicts the readout). Every neutral state (not beneficial, no load, pump waiting...) must
 * be stable for 300 ms first, so the model's honest "q is about 0" instant and rapid switching never flash
 * "Pendinginan tidak menguntungkan pada kondisi ini." (QA D-06).
 */
function useSettledKey(key: StatementData['key']): StatementData['key'] {
  const [shown, setShown] = useState(key);
  useEffect(() => {
    if (key === shown) return;
    const hold = key === 'harvest' || key === 'reject' ? 0 : 300;
    const id = window.setTimeout(() => setShown(key), hold);
    return () => window.clearTimeout(id);
  }, [key, shown]);
  return shown;
}

interface Layer {
  id: number;
  data: StatementData;
  leaving: boolean;
}

/** Fades in on mount (220 ms) and out when `leaving` (140 ms); reduced motion: 120 ms opacity only. */
function FadeLayer({ leaving, first, children }: { leaving: boolean; first: boolean; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  useEffect(() => {
    const el = ref.current;
    if (!el || !el.animate) return;
    if (leaving) {
      el.animate([{ opacity: 1 }, { opacity: 0 }], { duration: reduced ? 60 : 90, easing: 'linear', fill: 'forwards' });
    } else if (!first) {
      // one leaves (90 ms) before the other enters (130 ms): never two sentences on screen at once, 220 ms in total
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
 * THE statement: one sentence + one short detail line, from the computed regime of the VISUAL frame (never from
 * a mode flag). The regime is debounced (160 ms) so the model's honest "q is about 0" instant in the middle of
 * a weather transition never flashes a sentence; a change swaps two stacked layers (old out 90 ms, then new in 130 ms). Numbers in the detail line follow the live frame at <= 15 Hz while the key is stable.
 * Space for three lines is reserved, so nothing below it shifts.
 */
export function Statement({ className, tone = 'stage' }: { className?: string; tone?: 'stage' | 'page' }) {
  const live = useVisualSelect((f) => describeRegime(f.result), 15, eq);
  const key = useSettledKey(live.key);
  const [layers, setLayers] = useState<Layer[]>(() => [{ id: 0, data: live, leaving: false }]);
  const nextId = useRef(1);

  useEffect(() => {
    setLayers((cur) => {
      const top = cur[cur.length - 1];
      if (top && !top.leaving && top.data.key === key) return cur;
      const fresh = describeRegime(weather.frame().result);
      const data = fresh.key === key ? fresh : { ...fresh, key };
      return [...cur.map((l) => ({ ...l, leaving: true })), { id: nextId.current++, data, leaving: false }];
    });
  }, [key]);

  useEffect(() => {
    if (!layers.some((l) => l.leaving)) return;
    const id = window.setTimeout(() => setLayers((cur) => cur.filter((l) => !l.leaving)), 240);
    return () => window.clearTimeout(id);
  }, [layers]);

  return (
    <div className={className}>
      <div className="grid min-h-[8.5rem] lg:min-h-[7.25rem]">
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
