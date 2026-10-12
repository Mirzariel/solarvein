import { useCallback, useEffect, useRef, useState, type RefCallback } from 'react';

/** Lebar elemen (px) yang diukur dengan ResizeObserver; 0 sebelum terukur. */
export function useElementWidth<T extends Element = HTMLElement>(): [RefCallback<T>, number] {
  const [width, setWidth] = useState(0);
  const roRef = useRef<ResizeObserver | null>(null);

  const ref = useCallback<RefCallback<T>>((node) => {
    roRef.current?.disconnect();
    roRef.current = null;
    if (!node) return;
    setWidth(Math.round(node.getBoundingClientRect().width));
    if (typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver((entries) => {
      const entry = entries[entries.length - 1];
      if (entry) setWidth(Math.round(entry.contentRect.width));
    });
    ro.observe(node);
    roRef.current = ro;
  }, []);

  useEffect(() => () => roRef.current?.disconnect(), []);
  return [ref, width];
}
