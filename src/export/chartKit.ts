/** Tiny deterministic chart helpers for the export figures (no recharts: the SVG must stay clean). */

export function linear(d0: number, d1: number, r0: number, r1: number): (v: number) => number {
  const k = d1 === d0 ? 0 : (r1 - r0) / (d1 - d0);
  return (v) => r0 + (v - d0) * k;
}

/** "Nice" ticks covering [lo, hi] with about `n` steps. */
export function niceTicks(lo: number, hi: number, n = 5): number[] {
  if (!(hi > lo)) return [lo];
  const raw = (hi - lo) / n;
  const pow = 10 ** Math.floor(Math.log10(raw));
  const f = raw / pow;
  const step = (f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10) * pow;
  const out: number[] = [];
  for (let v = Math.ceil(lo / step) * step; v <= hi + step * 1e-9; v += step) out.push(Math.abs(v) < step * 1e-9 ? 0 : v);
  return out;
}

export function niceCeil(v: number, n = 5): number {
  const t = niceTicks(0, Math.max(v, 1e-9), n);
  const step = t.length > 1 ? (t[1] as number) - (t[0] as number) : 1;
  return Math.ceil(v / step - 1e-9) * step;
}

/** Greedy word wrap by character count (SVG text has no wrapping). */
export function wrap(text: string, max: number): string[] {
  const out: string[] = [];
  let line = '';
  for (const w of text.split(/\s+/)) {
    if (line && (line + ' ' + w).length > max) {
      out.push(line);
      line = w;
    } else {
      line = line ? line + ' ' + w : w;
    }
  }
  if (line) out.push(line);
  return out;
}

export const f1 = (n: number): string => n.toFixed(1).replace(/\.0$/, '');
