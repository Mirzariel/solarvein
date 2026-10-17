import type { ReactNode } from 'react';
import { LABELS } from '../sim/system';
import { EvidenceDot } from '../ui';
import { shortCite, type EvidenceSummary } from './refs';

export type Ratio = '16x9' | '4x5';

/** Fixed export sizes in CSS px (the script captures at deviceScaleFactor 3). */
export const SIZE: Record<Ratio, { w: number; h: number }> = {
  '16x9': { w: 1600, h: 900 },
  '4x5': { w: 1200, h: 1500 },
};

export const FOOTER_NOTE = 'Hasil simulasi SolarVein v2 · asumsi ilustratif';

export interface FrameProps extends EvidenceSummary {
  /** data-export id (also the file name). */
  id: string;
  ratio: Ratio;
  title: ReactNode;
  subtitle?: ReactNode;
  children: ReactNode;
}

/**
 * One exportable figure on light paper: title, body, and the data/source footer
 * (evidence tags + reference ids + the standing simulation note). `[data-export]` is what the export script captures.
 */
export function Frame({ id, ratio, title, subtitle, tags, refIds, children }: FrameProps) {
  const { w, h } = SIZE[ratio];
  const wide = ratio === '16x9';
  return (
    <figure
      data-export={id}
      data-ratio={ratio}
      className="export-frame m-0 flex flex-col overflow-hidden bg-paper text-ink"
      style={{ width: w, height: h, padding: wide ? '48px 64px 36px' : '56px 64px 40px' }}
    >
      <header className="flex-none">
        <h2 className="m-0 font-medium text-ink" style={{ fontSize: wide ? 40 : 38, lineHeight: wide ? '46px' : '44px', letterSpacing: '-0.025em' }}>
          {title}
        </h2>
        {subtitle ? (
          <p className="m-0 mt-2 text-ink-2" style={{ fontSize: 21, lineHeight: '30px', maxWidth: wide ? 1300 : 1000 }}>
            {subtitle}
          </p>
        ) : null}
      </header>
      <div className="min-h-0 flex-1" style={{ paddingTop: wide ? 20 : 28 }}>
        {children}
      </div>
      <footer className="flex-none border-t border-line-strong" style={{ paddingTop: 14, marginTop: 12 }}>
        <div className="flex items-start justify-between gap-10">
          <ul className="num m-0 flex list-none flex-wrap gap-x-5 gap-y-1 p-0 text-ink-2" style={{ fontSize: 15, lineHeight: '20px' }} aria-label="Jenis bukti">
            {tags.map((t) => (
              <li key={t} className="inline-flex items-center gap-2">
                <EvidenceDot tag={t} size={11} />
                {LABELS.evidence[t]}
              </li>
            ))}
          </ul>
          <p className="num m-0 flex-none text-right text-ink-2" style={{ fontSize: 15, lineHeight: '20px' }}>
            {FOOTER_NOTE}
          </p>
        </div>
        {refIds.length ? (
          <p className="num m-0 text-ink-3" style={{ marginTop: 6, fontSize: 13, lineHeight: '18px' }}>
            Rujukan: {refIds.slice(0, 8).map((r, i) => (
              <span key={r}>
                {i ? ' · ' : ''}
                {shortCite(r)} [{r}]
              </span>
            ))}
            {refIds.length > 8 ? ` · +${refIds.length - 8} lainnya di Pustaka` : ''}
          </p>
        ) : null}
      </footer>
    </figure>
  );
}
