/** Angka berformat id-ID (koma desimal, titik ribuan), minus tipografis, tanpa "-0". */
const cache = new Map<number, Intl.NumberFormat>();

function nf(digits: number): Intl.NumberFormat {
  let f = cache.get(digits);
  if (!f) {
    f = new Intl.NumberFormat('id-ID', { minimumFractionDigits: digits, maximumFractionDigits: digits });
    cache.set(digits, f);
  }
  return f;
}

/** Format angka; nilai yang membulat ke nol ditampilkan tanpa tanda. */
export function fmt(n: number, digits = 0): string {
  if (!Number.isFinite(n)) return '—';
  const rounded = Number(n.toFixed(digits));
  const v = rounded === 0 ? 0 : n;
  return nf(digits).format(v).replace('-', '−');
}

/** Format dengan tanda eksplisit (+/−); nol tanpa tanda. */
export function fmtSigned(n: number, digits = 0): string {
  if (!Number.isFinite(n)) return '—';
  const rounded = Number(n.toFixed(digits));
  if (rounded === 0) return nf(digits).format(0);
  return (rounded > 0 ? '+' : '') + fmt(n, digits);
}

/** Persen dari pecahan (0.192 → "19,2"). */
export function fmtPct(x: number, digits = 1): string {
  return fmt(x * 100, digits);
}

/** Spasi tak terputus antara angka dan satuan: fmtUnit(36.2, '°C', 1) → "36,2 °C". */
export function fmtUnit(n: number, unit: string, digits = 0): string {
  return unit ? `${fmt(n, digits)} ${unit}` : fmt(n, digits);
}
