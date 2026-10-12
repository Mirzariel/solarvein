import { cx } from './cx';

/**
 * SolarVein identity, redrawn as vectors from the brand artwork: three sheared plates (the stacked layers of the
 * collector, each notched around the one above like liquid following a channel) and a geometric "SOLAR VEIN"
 * wordmark with the crossbar-less A (Λ). Everything uses currentColor, so it follows the text colour.
 */

/** Plate 1, then plates 2–3 are the same notched shape 104 units apart. ViewBox 448 × 337. */
const PLATE_TOP = 'M220 0H448L278 112Q258 129 228 129H0L170 17Q190 0 220 0Z';
const PLATE_NOTCHED = 'M448 104H311L278 126Q258 143 228 143H147Q137 143 129 148L0 233H228Q258 233 278 216L448 104Z';

export function LogoMark({ className, title }: { className?: string; title?: string }) {
  return (
    <svg
      viewBox="0 0 448 337"
      className={cx('block shrink-0', className)}
      fill="currentColor"
      role={title ? 'img' : undefined}
      aria-hidden={title ? undefined : true}
      aria-label={title}
    >
      <path d={PLATE_TOP} />
      <path d={PLATE_NOTCHED} />
      <path d={PLATE_NOTCHED} transform="translate(0 104)" />
    </svg>
  );
}

/** Stroke-drawn letters on an 80-unit cap height; 9-unit stroke. ViewBox 1108 × 80. */
const WORD = [
  // S
  'M88 4.5H22Q4.5 4.5 4.5 20.5Q4.5 36 22 37L66 40.5Q83.5 41.5 83.5 58Q83.5 75.5 66 75.5H0',
  // O
  'M154.5 4.5H205.5Q225.5 4.5 225.5 24.5V55.5Q225.5 75.5 205.5 75.5H154.5Q134.5 75.5 134.5 55.5V24.5Q134.5 4.5 154.5 4.5Z',
  // L
  'M279.5 0V75.5H348',
  // Λ
  'M384 80L431 8.5H436.5L483 80',
  // R
  'M522.5 80V4.5H584Q603.5 4.5 603.5 22.5Q603.5 40 584 40H522.5M572 40L608 80',
  // V
  'M695 0L747.5 75L800 0',
  // E
  'M918 4.5H839.5V75.5H918M839.5 40H906',
  // I
  'M963 0V80',
  // N
  'M1016.5 80V4.5L1103.5 75.5V0',
].join('');

export function LogoWordmark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 1108 80" className={cx('block shrink-0', className)} fill="none" aria-hidden="true">
      <path d={WORD} stroke="currentColor" strokeWidth={9} strokeLinejoin="round" />
    </svg>
  );
}

export interface LogoProps {
  /** lockup = mark + wordmark side by side (header); stacked = mark above wordmark (footer, closing). */
  variant?: 'lockup' | 'stacked' | 'mark';
  className?: string;
}

export function Logo({ variant = 'lockup', className }: LogoProps) {
  if (variant === 'mark') return <LogoMark className={className} title="SolarVein" />;
  if (variant === 'stacked') {
    return (
      <span role="img" aria-label="SolarVein" className={cx('inline-flex flex-col items-center', className)}>
        <LogoMark className="w-[34%]" />
        <LogoWordmark className="mt-[9%] w-full" />
      </span>
    );
  }
  return (
    <span role="img" aria-label="SolarVein" className={cx('inline-flex items-center gap-[0.55em]', className)}>
      <LogoMark className="h-[1.35em] w-auto" />
      <LogoWordmark className="h-[0.62em] w-auto" />
    </span>
  );
}
