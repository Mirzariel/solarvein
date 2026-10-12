import type { ReactNode } from 'react';
import { ArrowIcon, BoltIcon } from './Icon';
import { cx } from './cx';
import { MINUS, formatId } from './numberFormat';

export type ReadoutKind = 'thermal' | 'electrical' | 'temperature' | 'neutral';

export interface ReadoutProps {
  /** Sentence-case label (12 px, ink-2). */
  label: ReactNode;
  value: number;
  /** Unit text, e.g. "W", "kWh", "°C". For thermal/electrical kinds a W_th / W_e subscript tag is appended. */
  unit?: string;
  digits?: number;
  /** thermal → W_th tag + heat/cool tint when `signed`; electrical → bolt glyph, value stays ink (never coloured). */
  kind?: ReadoutKind;
  /** Show an explicit +/− sign and the ↓/↑ heat-flow glyph (signed heat flow). */
  signed?: boolean;
  /** Hint text for positive / negative signed values (≤ 18 chars). */
  positiveHint?: string;
  negativeHint?: string;
  /** Third line (small, ink-2). */
  sublabel?: ReactNode;
  /** Override the subscript tag ("th", "e", …). Pass "" to hide. */
  unitTag?: string;
  /** lg = 40 px, md = 28 px, sm = 20 px mono value. */
  size?: 'sm' | 'md' | 'lg';
  /** `stage` uses stage tokens (dark 3D stage readout strip). */
  tone?: 'page' | 'stage';
  /** 1 px top rule (default true). Disable inside strips that draw their own dividers. */
  rule?: boolean;
  /** Pre-formatted text instead of `value` (e.g. an interpolated, already-throttled string). */
  text?: string;
  className?: string;
}

const VALUE_SIZE = { lg: 'text-readout-xl', md: 'text-readout-l', sm: 'text-readout-m' } as const;

function defaultTag(kind: ReadoutKind, unit: string | undefined): string {
  if (!unit) return '';
  if (kind === 'thermal' && /W/.test(unit)) return 'th';
  if (kind === 'electrical' && /W/.test(unit)) return 'e';
  return '';
}

/**
 * Instrument readout: hairline rule, label, mono value, lighter unit, optional heat-flow glyph.
 * Purely presentational: formats the number it is given and never derives values.
 * Only W_th is ever coloured (heat-ink / cool-ink); W_e stays ink.
 */
export function Readout({
  label,
  value,
  unit,
  digits = 0,
  kind = 'neutral',
  signed,
  positiveHint = 'panen',
  negativeHint = 'buang',
  sublabel,
  unitTag,
  size = 'md',
  tone = 'page',
  rule = true,
  text,
  className,
}: ReadoutProps) {
  const stage = tone === 'stage';
  const finite = Number.isFinite(value);
  const rounded = finite ? Number(value.toFixed(digits)) : 0;
  const sign = rounded > 0 ? 1 : rounded < 0 ? -1 : 0;
  const body = text ?? (finite ? formatId(Math.abs(value), digits) : '—');
  let prefix = '';
  if (text === undefined && finite) {
    if (sign < 0) prefix = MINUS;
    else if (sign > 0 && signed) prefix = '+';
  }
  const tag = unitTag ?? defaultTag(kind, unit);

  let valueTone = stage ? 'text-stage-ink' : 'text-ink';
  if (kind === 'thermal' && signed && sign !== 0) {
    valueTone = sign > 0 ? (stage ? 'text-stage-heat' : 'text-heat-ink') : stage ? 'text-stage-cool' : 'text-cool-ink';
  }
  const hint = signed && sign !== 0 ? (sign > 0 ? positiveHint : negativeHint) : null;
  const tagWord = tag === 'th' ? ' termal' : tag === 'e' ? ' listrik' : tag ? ` ${tag}` : '';
  const labelText = typeof label === 'string' ? label : '';
  const spoken = `${labelText}: ${prefix === MINUS ? 'minus ' : prefix === '+' ? 'plus ' : ''}${body} ${unit ?? ''}${tagWord}${hint ? `, ${hint}` : ''}`;

  return (
    <div
      className={cx('min-w-0', rule && 'border-t pt-3', rule && (stage ? 'border-stage-line' : 'border-line'), className)}
      role="group"
      aria-label={labelText ? spoken : undefined}
    >
      <p className={cx('flex items-center gap-2 text-label', stage ? 'text-stage-ink-2' : 'text-ink-2')} aria-hidden={labelText ? true : undefined}>
        {kind === 'electrical' ? <BoltIcon size={12} className="shrink-0" /> : null}
        <span className="truncate">{label}</span>
      </p>
      <p className="mt-2 flex flex-wrap items-baseline gap-x-2" aria-hidden={labelText ? true : undefined}>
        <span className={cx('num', VALUE_SIZE[size], valueTone)}>
          {prefix}
          {body}
        </span>
        {unit ? (
          <span className={cx('num text-mono-s', stage ? 'text-stage-ink-2' : 'text-ink-2')}>
            {unit}
            {tag ? <sub className="ml-px text-[0.7em]">{tag}</sub> : null}
          </span>
        ) : null}
      </p>
      {sublabel || hint ? (
        <p className={cx('mt-1 flex items-center gap-2 text-small', stage ? 'text-stage-ink-2' : 'text-ink-2')} aria-hidden={labelText ? true : undefined}>
          {hint ? (
            <span className={cx('inline-flex items-center gap-1', valueTone)}>
              <ArrowIcon size={12} direction="down" className={cx('transition-slide', sign < 0 && 'rotate-180')} />
              {hint}
            </span>
          ) : null}
          {sublabel ? <span>{sublabel}</span> : null}
        </p>
      ) : null}
    </div>
  );
}
