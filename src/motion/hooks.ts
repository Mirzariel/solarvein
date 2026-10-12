/**
 * React access to the weather engine. Nothing here re-renders per frame:
 *  - 3D code reads `weather.frame()` inside useFrame (zero allocation).
 *  - Text uses `useLiveText` (writes textContent directly) or `useVisualSelect` (state, <= 15 Hz, only on change).
 */
import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';
import type { SimResult } from '../sim';
import { weather } from './engine';
import { READOUT_HZ } from './tokens';
import type { VisualFrame } from './weather';

/** Stable frame object (mutated by the engine). Never triggers a render. */
export function useVisualFrameRef(): VisualFrame {
  return weather.frame();
}

/** Selected slice of the visual frame as React state, refreshed at most `hz` times per second and only on change. */
export function useVisualSelect<T>(
  select: (f: VisualFrame) => T,
  hz: number = READOUT_HZ,
  equals: (a: T, b: T) => boolean = Object.is,
): T {
  const [value, setValue] = useState<T>(() => select(weather.frame()));
  const sel = useRef(select);
  const eq = useRef(equals);
  sel.current = select;
  eq.current = equals;
  useEffect(() => {
    const apply = (f: VisualFrame): void => {
      const next = sel.current(f);
      setValue((prev) => (eq.current(prev, next) ? prev : next));
    };
    apply(weather.frame());
    return weather.subscribe(apply, hz);
  }, [hz]);
  return value;
}

/** Writes `format(select(frame))` into the element's textContent at <= hz. No React render. */
export function useLiveText<E extends HTMLElement>(
  ref: RefObject<E | null>,
  select: (r: SimResult) => number,
  format: (n: number) => string,
  hz: number = READOUT_HZ,
): void {
  const sel = useRef(select);
  const fmt = useRef(format);
  sel.current = select;
  fmt.current = format;
  useEffect(() => {
    let last = '';
    const apply = (f: VisualFrame): void => {
      const el = ref.current;
      if (!el) return;
      const s = fmt.current(sel.current(f.result));
      if (s !== last) {
        last = s;
        el.textContent = s;
      }
    };
    apply(weather.frame());
    return weather.subscribe(apply, hz);
  }, [ref, hz]);
}

/**
 * Debounced follower of a value: adopts a new value only after it has been stable for `holdMs`. Used for the
 * statement so the model's honest "q ~ 0" instant in the middle of a transition (a few ms) never flashes a sentence.
 */
export function useSettled<T>(value: T, holdMs = 160): T {
  const [shown, setShown] = useState(value);
  const latest = useRef(value);
  latest.current = value;
  useEffect(() => {
    if (Object.is(value, shown)) return;
    const id = window.setTimeout(() => setShown(latest.current), holdMs);
    return () => window.clearTimeout(id);
  }, [value, shown, holdMs]);
  return shown;
}

/** Stable callback ref helper. */
export function useStableCallback<A extends unknown[], R>(fn: (...a: A) => R): (...a: A) => R {
  const r = useRef(fn);
  r.current = fn;
  return useCallback((...a: A) => r.current(...a), []);
}
