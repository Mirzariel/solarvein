/**
 * Dirty-checked DOM writes for the per-frame projection sinks: positions are rounded to 0.5 px and an element is
 * only touched when the value actually changed (no style recalculation while the camera rests).
 */
const cache = new WeakMap<Element, Record<string, string>>();

/** Round to the nearest 0.5 px, as a string. */
export const r2 = (n: number): string => (Math.round(n * 2) / 2).toFixed(1);

export function setAttrC(el: Element, name: string, value: string): void {
  let c = cache.get(el);
  if (!c) cache.set(el, (c = {}));
  const k = `a:${name}`;
  if (c[k] === value) return;
  c[k] = value;
  el.setAttribute(name, value);
}

export function setStyleC(el: HTMLElement, name: 'transform' | 'visibility', value: string): void {
  let c = cache.get(el);
  if (!c) cache.set(el, (c = {}));
  const k = `s:${name}`;
  if (c[k] === value) return;
  c[k] = value;
  el.style[name] = value;
}
