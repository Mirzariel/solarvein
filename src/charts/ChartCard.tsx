import { useId, type ReactNode } from 'react';
import { ArrowIcon, cx } from '../ui';

interface ChartCardProps {
  title: ReactNode;
  /** Satuan di samping judul (mono-label), mis. "W" atau "°C". */
  unit?: ReactNode;
  /** Satu baris keterangan di bawah judul. */
  subtitle?: ReactNode;
  children: ReactNode;
  /** Catatan kecil di bawah grafik (asumsi, cara baca). */
  footer?: ReactNode;
  /** Kontrol di kanan judul (mis. segmented control). */
  actions?: ReactNode;
  /** Beri kotak (satu-satunya pengelompokan nyata). Default: tanpa kotak, hanya garis tipis di atas. */
  boxed?: boolean;
  className?: string;
}

/**
 * Pembungkus grafik tanpa kartu: garis tipis 1 px di atas, judul (h3) + satuan, satu baris keterangan,
 * isi, catatan. Kotak hanya bila `boxed` (pengelompokan nyata).
 */
export function ChartCard({ title, unit, subtitle, children, footer, actions, boxed, className }: ChartCardProps) {
  const id = useId();
  return (
    <section
      aria-labelledby={`${id}-t`}
      className={cx(
        'flex min-w-0 flex-col',
        boxed ? 'rounded-md border border-line bg-surface p-4 sm:p-6' : 'border-t border-line pt-4',
        className,
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 id={`${id}-t`} className="flex flex-wrap items-baseline gap-x-2 text-h3 text-ink">
            {title}
            {unit ? <span className="text-mono-label font-normal tracking-normal text-ink-3 mono">{unit}</span> : null}
          </h3>
          {subtitle ? <p className="mt-1 max-w-[64ch] text-small text-ink-2">{subtitle}</p> : null}
        </div>
        {actions}
      </div>
      <div className="mt-6 min-w-0 flex-1">{children}</div>
      {footer ? <div className="mt-4 max-w-[64ch] text-small text-ink-2">{footer}</div> : null}
    </section>
  );
}

/** Subskrip W_th / W_e yang konsisten untuk teks. */
export function Wth() {
  return (
    <span className="mono whitespace-nowrap">
      W<sub className="text-[0.7em]">th</sub>
    </span>
  );
}
export function We() {
  return (
    <span className="mono whitespace-nowrap">
      W<sub className="text-[0.7em]">e</sub>
    </span>
  );
}

/** Konvensi tanda W_th — tanpa kotak: dua baris dengan glif arah (↓ panen, ↑ buang). */
export function SignConvention({ className }: { className?: string }) {
  return (
    <div className={cx('border-t border-line pt-4 text-small text-ink-2', className)} role="note" aria-label="Konvensi tanda daya termal">
      <p className="text-label text-ink">
        Konvensi tanda <Wth />
      </p>
      <ul className="mt-2 grid gap-2 sm:grid-cols-2">
        <li className="flex items-start gap-2">
          <span className="num inline-flex shrink-0 items-center gap-1 text-heat-ink">
            <ArrowIcon size={12} direction="down" />+
          </span>
          <span>
            <span className="text-ink">Panen:</span> panas masuk ke cairan (dari panel).
          </span>
        </li>
        <li className="flex items-start gap-2">
          <span className="num inline-flex shrink-0 items-center gap-1 text-cool-ink">
            <ArrowIcon size={12} direction="up" />−
          </span>
          <span>
            <span className="text-ink">Pembuangan:</span> panas keluar dari cairan ke panel, lalu ke lingkungan.
          </span>
        </li>
      </ul>
      <p className="mt-2">
        <Wth /> dan <We /> tidak dijumlahkan tanpa konversi. Cairan selalu mengalir masuk → keluar; hanya tanda panasnya yang berubah.
      </p>
    </div>
  );
}
