import { useEffect, useRef, useState } from 'react';
import { useReducedMotion } from '../../hooks';

/**
 * Follows `target` with a 450 ms ease-out so a condition change ticks the number through intermediate values
 * instead of jumping. Reduced motion: snaps. Updates React state only while moving (rAF, rounded to `digits`).
 */
export function useEased(target: number, digits = 0, ms = 450): number {
  const reduced = useReducedMotion();
  const [shown, setShown] = useState(target);
  const from = useRef(target);
  const current = useRef(target);
  const raf = useRef(0);

  useEffect(() => {
    if (reduced || !Number.isFinite(target)) {
      current.current = target;
      setShown(target);
      return;
    }
    const start = performance.now();
    from.current = current.current;
    const step = (now: number) => {
      const p = Math.min(1, (now - start) / ms);
      const e = 1 - Math.pow(1 - p, 3);
      current.current = from.current + (target - from.current) * e;
      setShown(Number(current.current.toFixed(digits)));
      raf.current = p < 1 ? requestAnimationFrame(step) : 0;
    };
    raf.current = requestAnimationFrame(step);
    return () => {
      if (raf.current) cancelAnimationFrame(raf.current);
    };
  }, [target, digits, ms, reduced]);

  return shown;
}
