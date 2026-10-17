import { formatId, MINUS } from '../../ui';

/** Infinity / NaN / null → null (payback years that are Infinity). Mirrors the sim helper; kept local so views stay pure. */
export const finiteOrNull = (x: number | null | undefined): number | null => (typeof x === 'number' && Number.isFinite(x) ? x : null);

/** kg → ton CO₂e, id-ID. */
export const ton = (kg: number, digits = 1): string => formatId(kg / 1000, digits);
export const tonSigned = (kg: number, digits = 1): string => {
  const r = Number((kg / 1000).toFixed(digits));
  return (r > 0 ? '+' : '') + formatId(kg / 1000, digits);
};

/** IDR → "Rp34 juta" / "Rp1,05 miliar". Sign handled by the caller. */
export function idr(x: number): string {
  const a = Math.abs(x);
  if (a >= 1e9) return `Rp${formatId(a / 1e9, 2)} miliar`;
  if (a >= 1e7) return `Rp${formatId(a / 1e6, 0)} juta`;
  return `Rp${formatId(a / 1e6, 1)} juta`;
}
export const idrSigned = (x: number): string => (x > 0 ? '+' : x < 0 ? MINUS : '') + idr(x);

/** Payback triple → per-cell strings; non-finite cells are "tidak". */
export function paybackCells(p: readonly number[]): { text: string; years: number | null }[] {
  return p.map((v) => {
    const y = finiteOrNull(v);
    return { years: y, text: y === null ? 'tidak' : y > 99 ? '>100' : formatId(y, 1) };
  });
}

/**
 * Split the generated verdict into sentences without altering a word. The first block is the B2 sentence plus its
 * "Namun …" cost clause; everything else is context (B1, B3, B4, desikan).
 */
export function splitVerdict(verdict: string): { primary: string; rest: string } {
  const sentences = verdict.split(/(?<=\.)\s+(?=[A-ZÀ-Ý])/);
  let i = 1;
  while (i < sentences.length && /^Namun\b/.test(sentences[i]!)) i += 1;
  return { primary: sentences.slice(0, i).join(' '), rest: sentences.slice(i).join(' ') };
}
