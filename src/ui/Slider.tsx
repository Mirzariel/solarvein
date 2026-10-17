import { useEffect, useId, useState, type CSSProperties } from 'react';
import { formatId, parseId } from './numberFormat';
import { cx } from './cx';

/** Kept for old call sites: slider chrome is always neutral (colour is physics, not chrome). */
export type Accent = 'heat' | 'cool' | 'neutral';

export interface SliderMark {
  value: number;
  /** Optional tick label (mono, ink-3). */
  label?: string;
}

export interface SliderProps {
  id: string;
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit?: string;
  onChange: (value: number) => void;
  /** Short explanation, wired up with aria-describedby. */
  help?: string;
  /** Custom number formatting (defaults to the decimals implied by `step`). */
  format?: (n: number) => string;
  /** Extra labelled ticks (e.g. the presets). Values are clamped into [min, max]. */
  marks?: ReadonlyArray<number | SliderMark>;
  /** Default ("baku") value: drawn as an ink tick with a "baku" label on hover/focus. */
  defaultValue?: number;
  /** `compact` for the Lab: no tick labels, no help line. */
  density?: 'default' | 'compact';
  /** Show the editable mono value field (default true). When false the value is read-only text. */
  editable?: boolean;
  /** Ignored (chrome is neutral); accepted for compatibility. */
  accent?: Accent;
  disabled?: boolean;
  className?: string;
}

function decimalsOf(step: number): number {
  const s = String(step);
  if (s.includes('e-')) return Number(s.split('e-')[1]);
  const i = s.indexOf('.');
  return i < 0 ? 0 : s.length - i - 1;
}

/** x position of value-fraction p on a native range: thumb centre travels [thumb/2, 100% − thumb/2]. */
const posOf = (p: number): CSSProperties => ({ left: `calc(var(--thumb) / 2 + (100% - var(--thumb)) * ${p})` });

/**
 * Precision-instrument slider: native range input (keyboard/AT for free) on a drawn 2 px track with
 * ink fill, min/mid/max ticks + optional marks, and an editable mono value field with unit.
 * Enter/blur commits typed values (id-ID accepted), clamped to [min, max] and snapped to `step`.
 */
export function Slider({
  id,
  label,
  value,
  min,
  max,
  step,
  unit,
  onChange,
  help,
  format,
  marks,
  defaultValue,
  density = 'default',
  editable = true,
  disabled,
  className,
}: SliderProps) {
  const decimals = decimalsOf(step);
  const text = format ? format(value) : formatId(value, decimals);
  const span = max - min;
  const frac = (v: number) => (span > 0 ? Math.min(1, Math.max(0, (v - min) / span)) : 0);
  const p = frac(value);
  const helpId = help && density !== 'compact' ? `${id}-help` : undefined;
  const compact = density === 'compact';
  const uid = useId();

  const [draft, setDraft] = useState<string | null>(null);
  useEffect(() => setDraft(null), [value]);

  const commit = () => {
    if (draft === null) return;
    let n = parseId(draft);
    setDraft(null);
    if (Number.isNaN(n)) {
      // "1e999" overflows to ±Infinity: clamp to the range ends instead of ignoring the entry.
      const raw = Number(draft.trim().replace(/\s/g, '').replace(',', '.'));
      if (raw === Infinity) n = max;
      else if (raw === -Infinity) n = min;
    }
    if (!Number.isFinite(n)) return;
    const snapped = Math.round((n - min) / step) * step + min;
    const clamped = Math.min(max, Math.max(min, Number(snapped.toFixed(decimals + 2))));
    if (clamped !== value) onChange(clamped);
  };

  const fmtTick = (v: number) => (format ? format(v) : formatId(v, decimals));
  const extra: SliderMark[] = (marks ?? []).map((m) => (typeof m === 'number' ? { value: m } : m));
  const labelled = extra.filter((m) => m.label);
  const showDefault = defaultValue !== undefined && defaultValue >= min && defaultValue <= max;
  // Detents: eleven quiet dots along the track (every tenth of the range), like the click stops of a dial.
  const detents = Array.from({ length: 11 }, (_, i) => i / 10);
  const trackTop = 'top-[calc(var(--range-h)_/_2_-_3px)]';

  return (
    <div className={cx('group/slider', disabled && 'opacity-40', className)}>
      <div className="flex items-center justify-between gap-3">
        <label htmlFor={id} className="text-[14px] font-medium leading-5 tracking-[-0.005em] text-ink">
          {label}
        </label>
        {editable ? (
          <span className="flex h-9 items-center gap-1.5 rounded-full border border-transparent bg-sunken pl-3 pr-3 transition-ui focus-within:border-ink focus-within:bg-surface hover:border-line-strong pointer-coarse:h-11">
            <input
              type="text"
              inputMode="decimal"
              autoComplete="off"
              spellCheck={false}
              aria-label={`${label}, nilai`}
              aria-describedby={helpId}
              disabled={disabled}
              value={draft ?? text}
              onChange={(e) => setDraft(e.currentTarget.value)}
              onFocus={(e) => e.currentTarget.select()}
              onBlur={commit}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  commit();
                } else if (e.key === 'Escape') {
                  setDraft(null);
                }
              }}
              style={{ width: `${Math.max(3, (draft ?? text).length) + 0.5}ch` }}
              className="num min-w-0 bg-transparent text-right text-[15px] text-ink outline-none disabled:cursor-not-allowed"
            />
            {unit ? <span className="num text-[13px] text-ink-3">{unit}</span> : null}
          </span>
        ) : (
          <span className="flex items-baseline gap-1.5">
            <output htmlFor={id} className="num text-[15px] text-ink">
              {text}
            </output>
            {unit ? <span className="num text-[13px] text-ink-3">{unit}</span> : null}
          </span>
        )}
      </div>

      <div className="slider-ctl relative mt-2">
        {/* drawn track, fill and detents (the native input above them is transparent) */}
        <div aria-hidden="true" className={cx('pointer-events-none absolute inset-x-0 h-1.5 rounded-full bg-line', trackTop)} />
        <div
          aria-hidden="true"
          className={cx('pointer-events-none absolute left-0 h-1.5 rounded-full bg-ink transition-[width] duration-[60ms]', trackTop)}
          style={{ width: `calc(var(--thumb) / 2 + (100% - var(--thumb)) * ${p})` }}
        />
        <div aria-hidden="true" className={cx('pointer-events-none absolute inset-x-0 h-1.5', trackTop)}>
          {detents.map((f) => (
            <span
              key={f}
              className={cx('absolute top-1/2 size-[3px] -translate-x-1/2 -translate-y-1/2 rounded-full transition-opacity duration-[120ms]', f <= p ? 'opacity-0' : 'bg-ink-3/35')}
              style={posOf(f)}
            />
          ))}
          {extra
            .filter((m) => !m.label)
            .map((m, i) => (
              <span
                key={`${uid}-p${i}`}
                title="preset"
                className="absolute top-[calc(100%+5px)] size-1 -translate-x-1/2 rounded-full bg-ink-3"
                style={posOf(frac(m.value))}
              />
            ))}
          {showDefault ? (
            <span
              title="baku"
              className="absolute top-[calc(100%+4px)] h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-sun"
              style={posOf(frac(defaultValue as number))}
            />
          ) : null}
        </div>
        <input
          id={id}
          type="range"
          className="range"
          min={min}
          max={max}
          step={step}
          value={value}
          disabled={disabled}
          aria-valuetext={unit ? `${text} ${unit}` : text}
          aria-describedby={helpId}
          onChange={(e) => onChange(Number(e.currentTarget.value))}
        />

        {/* scale: only the ends (full density) and the labelled marks, set small and quiet */}
        {!compact || labelled.length ? (
          <div aria-hidden="true" className="relative mt-0.5 h-4">
            {!compact || labelled.length ? (
              <>
                <span className="num absolute left-0 text-[11px] leading-4 text-ink-3">{fmtTick(min)}</span>
                <span className="num absolute right-0 text-[11px] leading-4 text-ink-3">{fmtTick(max)}</span>
              </>
            ) : null}
            {labelled.map((m, i) => {
              const f = frac(m.value);
              const edge = f < 0.04 ? 'translate-x-0' : f > 0.96 ? '-translate-x-full' : '-translate-x-1/2';
              const near = Math.abs(f - p) < 0.06;
              return (
                <span
                  key={`${uid}-x${i}`}
                  className={cx('num absolute whitespace-nowrap text-[11px] leading-4 transition-colors duration-[200ms]', edge, near ? 'text-ink' : 'text-ink-3')}
                  style={f < 0.04 ? { left: 0 } : f > 0.96 ? { left: '100%' } : posOf(f)}
                >
                  {m.label}
                </span>
              );
            })}
          </div>
        ) : null}
      </div>

      {help && !compact ? (
        <p id={helpId} className="mt-1 text-small text-ink-2">
          {help}
        </p>
      ) : null}
    </div>
  );
}
