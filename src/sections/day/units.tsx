import type { ReactNode } from 'react';
import { NBSP, formatId } from '../../ui';

/** kW / kWh with the th (thermal) or e (electrical) subscript: the two are never added or mixed in one number. */
export type EnergyKind = 'th' | 'e';

export function Unit({ unit, kind }: { unit: string; kind?: EnergyKind }) {
  return (
    <span className="num whitespace-nowrap text-ink-2">
      {unit}
      {kind ? <sub className="ml-px text-[0.7em]">{kind}</sub> : null}
    </span>
  );
}

/** "12,3 kW_th" with a non-breaking space between number and unit. */
export function Val({
  v,
  d = 1,
  unit,
  kind,
  signed,
  className,
}: {
  v: number;
  d?: number;
  unit: string;
  kind?: EnergyKind;
  signed?: boolean;
  className?: string;
}) {
  const body = formatId(Math.abs(v), d);
  const neg = Number(v.toFixed(d)) < 0;
  const pos = Number(v.toFixed(d)) > 0;
  return (
    <span className="whitespace-nowrap">
      <span className={className ?? 'num text-ink'}>
        {neg ? '−' : signed && pos ? '+' : ''}
        {body}
      </span>
      {NBSP}
      <Unit unit={unit} kind={kind} />
    </span>
  );
}

/** Inline key: the real encoding drawn at 10 px, then its label. */
export function Key({ swatch, children }: { swatch: ReactNode; children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-2 text-small text-ink-2">
      {swatch}
      {children}
    </span>
  );
}
