/** Tiny scale / path helpers for the plain-SVG charts (no dependency, no DOM). */
export const linear =
  (d0: number, d1: number, r0: number, r1: number) =>
  (v: number): number =>
    d1 === d0 ? r0 : r0 + ((v - d0) / (d1 - d0)) * (r1 - r0);

const f = (n: number): string => (Math.round(n * 100) / 100).toString();

/** "M x y L x y …" polyline through the points; `null` y values break the line. */
export function linePath(xs: readonly number[], ys: ReadonlyArray<number | null>): string {
  let d = '';
  let pen = false;
  for (let i = 0; i < xs.length; i++) {
    const y = ys[i];
    if (y === null || y === undefined || !Number.isFinite(y)) {
      pen = false;
      continue;
    }
    d += `${pen ? 'L' : 'M'}${f(xs[i] as number)} ${f(y)}`;
    pen = true;
  }
  return d;
}

/** Closed band between two y series sharing x (top is drawn left→right, bottom right→left). */
export function bandPath(xs: readonly number[], top: readonly number[], bottom: readonly number[]): string {
  if (xs.length === 0) return '';
  let d = '';
  for (let i = 0; i < xs.length; i++) d += `${i === 0 ? 'M' : 'L'}${f(xs[i] as number)} ${f(top[i] as number)}`;
  for (let i = xs.length - 1; i >= 0; i--) d += `L${f(xs[i] as number)} ${f(bottom[i] as number)}`;
  return d + 'Z';
}

/** Smallest "nice" value ≥ v from a 1-2-2.5-5-10 ladder (never below `floor`). */
export function niceCeil(v: number, floor = 0): number {
  const x = Math.max(v, floor, 1e-9);
  const mag = 10 ** Math.floor(Math.log10(x));
  for (const m of [1, 2, 2.5, 5, 10]) if (m * mag >= x - 1e-12) return m * mag;
  return 10 * mag;
}
