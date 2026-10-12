import { useCallback, useEffect, useRef, useState, type RefCallback } from 'react';

export interface UseInViewOptions {
  /** Extra margin around the viewport, e.g. '200px' to start slightly early. */
  rootMargin?: string;
  threshold?: number | number[];
  /** Latch to true after the first intersection (for lazy mount / one-shot reveal). */
  once?: boolean;
}

/**
 * IntersectionObserver wrapper. Returns a callback ref and the current visibility.
 * Use it to pause expensive animations / charts while offscreen.
 *
 *   const [ref, inView] = useInView<HTMLDivElement>({ rootMargin: '100px' });
 *
 * Falls back to `true` when IntersectionObserver is unavailable.
 */
export function useInView<T extends Element = HTMLElement>(
  options: UseInViewOptions = {},
): [RefCallback<T>, boolean] {
  const { rootMargin = '0px', threshold = 0, once = false } = options;
  const [inView, setInView] = useState(false);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const thresholdKey = Array.isArray(threshold) ? threshold.join(',') : String(threshold);

  const ref = useCallback<RefCallback<T>>(
    (node) => {
      observerRef.current?.disconnect();
      observerRef.current = null;
      if (!node) return;
      if (typeof IntersectionObserver === 'undefined') {
        setInView(true);
        return;
      }
      const observer = new IntersectionObserver(
        (entries) => {
          const entry = entries[entries.length - 1];
          if (!entry) return;
          setInView(entry.isIntersecting);
          if (once && entry.isIntersecting) observer.disconnect();
        },
        {
          rootMargin,
          threshold: thresholdKey.includes(',') ? thresholdKey.split(',').map(Number) : Number(thresholdKey),
        },
      );
      observer.observe(node);
      observerRef.current = observer;
    },
    [rootMargin, thresholdKey, once],
  );

  useEffect(() => () => observerRef.current?.disconnect(), []);

  return [ref, inView];
}
