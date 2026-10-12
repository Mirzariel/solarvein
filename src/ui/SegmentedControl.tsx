import { useRef, type CSSProperties, type KeyboardEvent, type ReactNode } from 'react';
import { cx } from './cx';

export interface SegmentedOption<T extends string> {
  value: T;
  label: string;
  icon?: ReactNode;
  /** Shown as a native tooltip (title). */
  description?: string;
  /** 6 px mode dot shown on the selected segment only (heat for Cerah, cool for Hujan). */
  dot?: 'heat' | 'cool';
}

export interface SegmentedControlProps<T extends string> {
  options: readonly SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
  ariaLabel: string;
  /** `sm` = 32 px, `md` = 40 px (`lg` is accepted for old call sites and renders as `md`). */
  size?: 'sm' | 'md' | 'lg';
  /** `page` (light) or `stage` (on the dark 3D stage). */
  tone?: 'page' | 'stage';
  /** Stretch segments to fill the container. */
  fullWidth?: boolean;
  /** Neutral "no option selected" display (e.g. Kustom): the thumb hides and no radio is checked. */
  noSelection?: boolean;
  className?: string;
}

// Coarse pointers: 54px track − 2×4px padding − 2×1px border = 44px tap targets per option.
const H = { sm: 'h-9 pointer-coarse:h-[54px]', md: 'h-11 pointer-coarse:h-[54px]', lg: 'h-12 pointer-coarse:h-[54px]' } as const;
const SEG_TEXT = { sm: 'text-label', md: 'text-button', lg: 'text-button' } as const;

const TRACK = {
  page: 'border-line bg-sunken',
  stage: 'border-stage-line bg-stage-ink/[0.06]',
} as const;
const THUMB = {
  page: 'border border-line bg-surface shadow-thumb',
  stage: 'bg-stage-ink',
} as const;
const TEXT = {
  page: { on: 'text-ink', off: 'text-ink-2 hover:text-ink' },
  stage: { on: 'text-stage-0', off: 'text-stage-ink-2 hover:text-stage-ink' },
} as const;

/**
 * Radiogroup with a single sliding thumb (CSS transform, 220 ms ease-ui; reduced motion: no slide).
 * Roving tabindex; arrow keys move AND select (WAI-ARIA radio pattern); Home/End jump.
 * Segments are equal width so the thumb is one element translating by whole segments.
 */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  ariaLabel,
  size = 'md',
  tone = 'page',
  fullWidth,
  noSelection,
  className,
}: SegmentedControlProps<T>) {
  const refs = useRef<Array<HTMLButtonElement | null>>([]);
  const found = options.findIndex((o) => o.value === value);
  const activeIndex = Math.max(0, found);
  const hasThumb = !noSelection && found >= 0;
  const n = options.length;

  const move = (to: number) => {
    const idx = ((to % n) + n) % n;
    const opt = options[idx];
    if (!opt) return;
    onChange(opt.value);
    refs.current[idx]?.focus();
  };

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    switch (e.key) {
      case 'ArrowRight':
      case 'ArrowDown':
        e.preventDefault();
        move(activeIndex + 1);
        break;
      case 'ArrowLeft':
      case 'ArrowUp':
        e.preventDefault();
        move(activeIndex - 1);
        break;
      case 'Home':
        e.preventDefault();
        move(0);
        break;
      case 'End':
        e.preventDefault();
        move(n - 1);
        break;
    }
  };

  const thumbStyle: CSSProperties = {
    width: `calc((100% - 8px) / ${n})`,
    transform: `translateX(${activeIndex * 100}%)`,
  };

  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      onKeyDown={onKeyDown}
      data-tone={tone}
      className={cx(
        'relative grid-flow-col auto-cols-fr rounded-full border p-1',
        H[size],
        TRACK[tone],
        fullWidth ? 'grid w-full' : 'inline-grid',
        className,
      )}
    >
      <span
        aria-hidden="true"
        className={cx(
          'pointer-events-none absolute inset-y-1 left-1 rounded-full transition-slide',
          THUMB[tone],
          hasThumb ? 'opacity-100' : 'opacity-0',
        )}
        style={thumbStyle}
      />
      {options.map((o, i) => {
        const selected = hasThumb && i === activeIndex;
        return (
          <button
            key={o.value}
            ref={(el) => {
              refs.current[i] = el;
            }}
            type="button"
            role="radio"
            aria-checked={selected}
            tabIndex={i === activeIndex ? 0 : -1}
            title={o.description}
            onClick={() => onChange(o.value)}
            className={cx(
              'relative z-10 inline-flex min-w-0 items-center justify-center gap-2 rounded-full px-4 transition-ui active:scale-[0.98]',
              SEG_TEXT[size],
              size === 'sm' ? 'sm:min-w-16' : 'sm:min-w-28',
              fullWidth && 'flex-1',
              selected ? TEXT[tone].on : TEXT[tone].off,
            )}
          >
            {selected && o.dot ? (
              <span
                aria-hidden="true"
                className={cx('size-1.5 shrink-0 rounded-full', o.dot === 'heat' ? 'bg-heat-mark' : 'bg-cool')}
              />
            ) : null}
            {o.icon}
            <span className="truncate">{o.label}</span>
          </button>
        );
      })}
    </div>
  );
}
