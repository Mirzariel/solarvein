import type { ReactNode } from 'react';
import { MINUS, cx, formatId } from '../../ui';

/**
 * Angka editorial besar untuk Dampak: sans dengan angka tabular (bukan mono: pada ukuran besar mono terbaca seperti
 * terminal), satuan lebih kecil dan lebih terang. Setiap angka dibawa catatan dasarnya.
 */
export function BigStat({
  label,
  value,
  digits,
  unit,
  unitTag,
  note,
  className,
}: {
  label: ReactNode;
  value: number;
  digits: number;
  unit: string;
  unitTag?: string;
  note?: ReactNode;
  className?: string;
}) {
  const finite = Number.isFinite(value);
  return (
    <div className={cx('min-w-0 border-t border-line pt-4', className)}>
      <p className="text-small text-ink-2">{label}</p>
      <p className="mt-2 flex flex-wrap items-baseline gap-x-3">
        <span className="text-[clamp(44px,4.4vw,72px)] font-medium leading-[1] tracking-[-0.04em] tabular-nums text-ink">
          {finite && Number(value.toFixed(digits)) < 0 ? MINUS : ''}
          {finite ? formatId(Math.abs(value), digits) : '—'}
        </span>
        <span className="text-readout-m font-medium text-ink-2">
          {unit}
          {unitTag ? <sub className="ml-px text-[0.7em]">{unitTag}</sub> : null}
        </span>
      </p>
      {note ? <p className="mt-3 max-w-[40ch] text-small text-ink-2">{note}</p> : null}
    </div>
  );
}
