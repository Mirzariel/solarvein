import { Fragment, type ReactNode } from 'react';

const UNIT = /\b(kWh|MWh|kW|W)_(th|e)\b/g;

/**
 * Teks dari model (asumsi, kalimat putusan) memakai "kWh_th" dan "~". Tampilan memakai subskrip, "sekitar" untuk "~",
 * dan spasi tak terputus sebelum "%": satuan tidak pernah dicetak dengan garis bawah.
 */
export function U({ children }: { children: string }): ReactNode {
  const text = children.replace(/~(?=\s?[\dR])/g, 'sekitar ').replace(/(\d) %/g, '$1 %');
  const out: ReactNode[] = [];
  let last = 0;
  let k = 0;
  for (const m of text.matchAll(UNIT)) {
    const i = m.index ?? 0;
    if (i > last) out.push(text.slice(last, i));
    out.push(
      <Fragment key={k++}>
        {m[1]}
        <sub className="text-[0.75em]">{m[2]}</sub>
      </Fragment>,
    );
    last = i + m[0].length;
  }
  if (last < text.length) out.push(text.slice(last));
  return <>{out}</>;
}
