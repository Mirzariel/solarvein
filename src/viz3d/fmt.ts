/** Indonesian number formatting for the 3D stage (decimal comma, true minus U+2212). Three-free. */
const cache = new Map<number, Intl.NumberFormat>();

function nf(digits: number): Intl.NumberFormat {
  let f = cache.get(digits);
  if (!f) {
    f = new Intl.NumberFormat('id-ID', { minimumFractionDigits: digits, maximumFractionDigits: digits });
    cache.set(digits, f);
  }
  return f;
}

export function formatId(n: number, digits = 0): string {
  if (!Number.isFinite(n)) return '—';
  const rounded = Number(n.toFixed(digits));
  const v = rounded === 0 ? 0 : n;
  return nf(digits).format(v).replace('-', '−');
}
