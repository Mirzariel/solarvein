import type { ReactNode } from 'react';
import { cx } from './cx';

export interface SectionIndexProps {
  /** Mono numeral, e.g. "01". */
  n: string;
  /** Section name, e.g. "Pengalaman". */
  label: string;
  /** Light text for headings over the dark stage or a photo. */
  inverse?: boolean;
  className?: string;
}

/** "01 — Pengalaman": a quiet line directly above the heading it belongs to. */
export function SectionIndex({ n, label, inverse, className }: SectionIndexProps) {
  return (
    <div className={cx('section-index', inverse && 'text-white/70', className)} aria-label={`${n} — ${label}`}>
      <span aria-hidden="true" className={cx('num text-[13px] tracking-normal', inverse ? 'text-sun' : 'text-heat-ink')}>
        {n}
      </span>
      <span aria-hidden="true" className={cx('h-px w-6', inverse ? 'bg-white/35' : 'bg-line-strong')} />
      <span aria-hidden="true">{label}</span>
    </div>
  );
}

export interface SectionHeaderProps {
  /** "01" / "Pengalaman" → renders `SectionIndex` above the title. */
  index?: { n: string; label: string };
  /** Legacy plain label (prefer `index`). */
  eyebrow?: string;
  title: ReactNode;
  /** One sentence, directly under the title (never in a far column). */
  lead?: ReactNode;
  /** id placed on the heading (use with aria-labelledby on the <section>). */
  id?: string;
  as?: 'h1' | 'h2' | 'h3';
  inverse?: boolean;
  /** Ignored: everything is left-aligned. */
  align?: 'left' | 'center';
  className?: string;
}

/** Section head: index line → H2 statement → optional one-sentence lead. One block, one left edge. */
export function SectionHeader({ eyebrow, index, title, lead, id, as: Tag = 'h2', inverse, className }: SectionHeaderProps) {
  return (
    <header className={cx('max-w-4xl', className)}>
      {index ? (
        <SectionIndex n={index.n} label={index.label} inverse={inverse} />
      ) : eyebrow ? (
        <p className={cx('section-index', inverse && 'text-white/70')}>{eyebrow}</p>
      ) : null}
      <Tag id={id} className={cx('text-h2', inverse ? 'text-white' : 'text-ink', (index || eyebrow) && 'mt-5')}>
        {title}
      </Tag>
      {lead ? <div className={cx('mt-5 max-w-[52ch] text-lead', inverse ? 'text-white/75' : 'text-ink-2')}>{lead}</div> : null}
    </header>
  );
}
