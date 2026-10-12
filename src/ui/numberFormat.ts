/** Indonesian number formatting (decimal comma, dot grouping) shared by UI primitives. Always a true minus (U+2212). */
const cache = new Map<number, Intl.NumberFormat>();

export const MINUS = '−';

function nf(digits: number): Intl.NumberFormat {
  let f = cache.get(digits);
  if (!f) {
    f = new Intl.NumberFormat('id-ID', { minimumFractionDigits: digits, maximumFractionDigits: digits });
    cache.set(digits, f);
  }
  return f;
}

/** Format with id-ID separators and a true minus. Values that round to zero lose their sign. */
export function formatId(n: number, digits = 0): string {
  if (!Number.isFinite(n)) return '—';
  const rounded = Number(n.toFixed(digits));
  const v = rounded === 0 ? 0 : n;
  return nf(digits).format(v).replace('-', MINUS);
}

/** Same as formatId but with an explicit "+" for positive deltas. Zero has no sign. */
export function formatSigned(n: number, digits = 0): string {
  if (!Number.isFinite(n)) return '—';
  const rounded = Number(n.toFixed(digits));
  if (rounded === 0) return nf(digits).format(0);
  return (rounded > 0 ? '+' : '') + formatId(n, digits);
}

/** Parse user input typed in id-ID ("1.200,5", "12,5") or plain ("12.5", "-3"). Returns NaN when unparseable. */
export function parseId(input: string): number {
  let s = input.trim().replace(/\s/g, '').replace(MINUS, '-');
  if (s === '') return NaN;
  if (s.includes(',')) s = s.replace(/\./g, '').replace(',', '.');
  else if (/^-?\d{1,3}(\.\d{3})+$/.test(s)) s = s.replace(/\./g, '');
  const n = Number(s);
  return Number.isFinite(n) ? n : NaN;
}

/** Non-breaking space (U+00A0): keeps a number and its unit on one line. */
export const NBSP = ' ';

/**
 * Number + unit with a non-breaking space and a true minus: `formatWithUnit(36.2, '°C', 1)` → "36,2 °C".
 * Use for any inline measured value in prose, tooltips, aria text and chart labels.
 */
export function formatWithUnit(n: number, unit: string, digits = 0, opts: { signed?: boolean } = {}): string {
  const num = opts.signed ? formatSigned(n, digits) : formatId(n, digits);
  return unit ? `${num}${NBSP}${unit}` : num;
}

/**
 * Typesetting pass for static Indonesian copy (v2 §B.6). Pure string → string; apply to text nodes, never to markup.
 *  1. NBSP between a number and the word/unit that follows (`865 W`, `36,2 °C`, `10.000 atap`); no space before `%`.
 *  2. NBSP after words of ≤ 3 letters that are not the last word (di, ke, dan, itu, ini…).
 *  3. NBSP in fixed pairs (`Hari cerah`, `Hari hujan`).
 *  4. Curly quotes and apostrophes; en dash in numeric ranges; × between numbers; true minus before a number.
 * Ellipsis is left alone (reserved for loading states).
 */
export function typo(text: string): string {
  let s = text;
  // quotes and apostrophes
  s = s.replace(/(^|[\s(\[—–-])"/g, '$1\u201C').replace(/"/g, '\u201D');
  s = s.replace(/(^|[\s(\[—–-])'/g, '$1\u2018').replace(/'/g, '\u2019');
  // ranges, products, minus
  s = s.replace(/(\d)\s?[-\u2013]\s?(\d)/g, '$1\u2013$2');
  s = s.replace(/(\d)\s?[x\u00D7]\s?(\d)/g, '$1\u00D7$2');
  s = s.replace(/(^|[\s(])-(?=\d)/g, '$1' + MINUS);
  // % hugs the number
  s = s.replace(/(\d)\s+%/g, '$1%');
  // number + following word/unit
  s = s.replace(/(\d)[ \u202F]+(?=[\p{L}\u00B0])/gu, '$1' + NBSP);
  // fixed pairs
  s = s.replace(/\b(Hari|hari) (cerah|hujan)\b/g, '$1' + NBSP + '$2');
  // short words stay with the next word
  s = s.replace(/(^|[\s(\u201C])(\p{L}{1,3}) (?=[^\s])/gu, '$1$2' + NBSP);
  return s;
}
