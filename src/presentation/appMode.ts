/**
 * App mode from the URL. Query params only (no paths), so a static host needs no SPA rewrite:
 *   ?presentasi=1          presentation mode (keyboard-stepped scenes, larger type)
 *   ?export=1[&static=1]   figure export page (no header, Lenis or 3D canvas)
 * `export` wins when both are present.
 */
export type AppMode = 'site' | 'presentation' | 'export';

const OFF = new Set(['0', 'false', 'off', 'no']);

/** `?x`, `?x=1`, `?x=true` are on; `?x=0`, `?x=false` and a missing key are off. */
export function flag(search: string, key: string): boolean {
  const v = new URLSearchParams(search).get(key);
  return v !== null && !OFF.has(v.toLowerCase());
}

export function appMode(search: string = typeof location !== 'undefined' ? location.search : ''): AppMode {
  if (flag(search, 'export')) return 'export';
  if (flag(search, 'presentasi')) return 'presentation';
  return 'site';
}
