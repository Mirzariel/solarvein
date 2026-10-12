/** Indonesian number formatting (decimal comma, thin grouping). Pure helpers, no React. */

const cache = new Map<number, Intl.NumberFormat>();

function nf(digits: number): Intl.NumberFormat {
  let f = cache.get(digits);
  if (!f) {
    f = new Intl.NumberFormat('id-ID', { minimumFractionDigits: digits, maximumFractionDigits: digits });
    cache.set(digits, f);
  }
  return f;
}

/** 34.123 -> "34,1" (digits = 1). Non-finite values render as an em dash. */
export function fmt(n: number, digits = 0): string {
  if (!Number.isFinite(n)) return '—';
  const v = Math.abs(n) < 0.5 * 10 ** -digits ? 0 : n; // avoid "-0,0"
  return nf(digits).format(v).replace('-', '−');
}

/** Same as fmt but always with an explicit sign for non-zero values. */
export function fmtSigned(n: number, digits = 0): string {
  const s = fmt(n, digits);
  return Number(n.toFixed(digits)) > 0 ? `+${s}` : s;
}

/** Number of decimals implied by a slider step (0.05 -> 2). */
export function decimalsOf(step: number): number {
  const s = String(step);
  if (s.includes('e-')) return Number(s.split('e-')[1]);
  const i = s.indexOf('.');
  return i < 0 ? 0 : s.length - i - 1;
}
