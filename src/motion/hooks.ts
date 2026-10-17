/**
 * React access to the weather engine. Nothing here re-renders per frame:
 *  - 3D code reads `weather.frame()` inside useFrame (zero allocation).
 *  - Text uses `useLiveText` (writes textContent directly) or `useVisualSelect` (state, <= 15 Hz, only on change).
 */
import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';
import type { SimResult } from '../sim';
import type { ClimatePoint, RouterSnapshot } from '../sim/system';
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

/** Runs `cb(frame)` for every engine step (hz = 0) or at most `hz` times per second, plus the current frame at mount. */
export function useFrameListener(cb: (f: VisualFrame) => void, hz = 0): void {
  const fn = useRef(cb);
  fn.current = cb;
  useEffect(() => {
    const apply = (f: VisualFrame): void => fn.current(f);
    apply(weather.frame());
    return weather.subscribe(apply, hz);
  }, [hz]);
}

/** Writes `format(frame)` into the element's textContent at <= hz (clock, valve percentages, any v2 readout). No React render. */
export function useLiveFrameText<E extends HTMLElement>(
  ref: RefObject<E | null>,
  format: (f: VisualFrame) => string,
  hz: number = READOUT_HZ,
): void {
  const fmt = useRef(format);
  fmt.current = format;
  useEffect(() => {
    let last = '';
    const apply = (f: VisualFrame): void => {
      const el = ref.current;
      if (!el) return;
      const s = fmt.current(f);
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
 * Live router state without a render: `ref.current` always reads the router snapshot of the current visual frame
 * (a fresh immutable object per engine step, so compare by value or read inside a frame loop / useFrameListener).
 */
export function useRouterFrameRef(): { readonly current: RouterSnapshot } {
  return ROUTER_REF;
}
/** Same for the climate at the visual clock (irradiance, ambient, RH, humidity ratio, wind, rain). */
export function useClimateFrameRef(): { readonly current: ClimatePoint } {
  return CLIMATE_REF;
}
const ROUTER_REF = {
  get current(): RouterSnapshot {
    return weather.frame().router as RouterSnapshot;
  },
};
const CLIMATE_REF = {
  get current(): ClimatePoint {
    return weather.frame().climate as ClimatePoint;
  },
};

/** React state of a climate slice (plus the clock hour of day), <= hz, only on change. */
export function useLiveClimate<T>(
  select: (c: ClimatePoint, hourOfDay: number) => T,
  hz: number = READOUT_HZ,
  equals: (a: T, b: T) => boolean = Object.is,
): T {
  return useVisualSelect((f) => select(f.climate as ClimatePoint, f.hourOfDay ?? 12), hz, equals);
}

/** React state of a router slice, <= hz, only on change. */
export function useLiveRouter<T>(
  select: (r: RouterSnapshot) => T,
  hz: number = READOUT_HZ,
  equals: (a: T, b: T) => boolean = Object.is,
): T {
  return useVisualSelect((f) => select(f.router as RouterSnapshot), hz, equals);
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
