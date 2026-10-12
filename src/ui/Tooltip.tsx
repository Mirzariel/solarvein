import { cloneElement, isValidElement, useCallback, useEffect, useId, useRef, useState, type ReactElement, type ReactNode } from 'react';
import { cx } from './cx';
import { InfoIcon } from './Icon';

export type TooltipSide = 'top' | 'bottom' | 'left' | 'right';

export interface TooltipProps {
  /** Tooltip text (keep it to a short sentence). */
  content: ReactNode;
  /** The trigger. A single element: it receives aria-describedby. */
  children: ReactElement<{ 'aria-describedby'?: string }>;
  side?: TooltipSide;
  /** Hover delay in ms (focus shows immediately). Default 400. */
  delay?: number;
  /** `stage` for use on the dark 3D stage. */
  tone?: 'page' | 'stage';
  className?: string;
}

const POS: Record<TooltipSide, string> = {
  top: 'bottom-full left-1/2 mb-2 -translate-x-1/2',
  bottom: 'top-full left-1/2 mt-2 -translate-x-1/2',
  left: 'right-full top-1/2 mr-2 -translate-y-1/2',
  right: 'left-full top-1/2 ml-2 -translate-y-1/2',
};

/**
 * Small, keyboard-accessible tooltip (hover after `delay`, focus immediately, Escape dismisses).
 * Content is exposed through aria-describedby; it is supplementary, never the only label.
 */
export function Tooltip({ content, children, side = 'top', delay = 400, tone = 'page', className }: TooltipProps) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clear = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  }, []);
  const show = useCallback(
    (wait: number) => {
      clear();
      if (wait <= 0) setOpen(true);
      else timer.current = setTimeout(() => setOpen(true), wait);
    },
    [clear],
  );
  const hide = useCallback(() => {
    clear();
    setOpen(false);
  }, [clear]);
  useEffect(() => clear, [clear]);

  const trigger = isValidElement(children) ? cloneElement(children, { 'aria-describedby': id }) : children;

  return (
    <span
      className={cx('relative inline-flex', className)}
      onMouseEnter={() => show(delay)}
      onMouseLeave={hide}
      onFocusCapture={() => show(0)}
      onBlurCapture={hide}
      onKeyDown={(e) => {
        if (e.key === 'Escape') hide();
      }}
    >
      {trigger}
      <span
        id={id}
        role="tooltip"
        className={cx(
          'pointer-events-none absolute z-40 w-max max-w-64 rounded-sm px-2 py-1 text-mono-label transition-ui',
          POS[side],
          tone === 'stage' ? 'border border-stage-line bg-stage-1 text-stage-ink' : 'border border-line-strong bg-surface text-ink shadow-pop',
          open ? 'opacity-100' : 'opacity-0',
        )}
        aria-hidden={!open}
      >
        {content}
      </span>
    </span>
  );
}

export interface InfoTipProps {
  /** Tooltip content. */
  children: ReactNode;
  /** Accessible name of the trigger. */
  label?: string;
  side?: TooltipSide;
  tone?: 'page' | 'stage';
  className?: string;
}

/**
 * Bare 16 px info glyph with a tooltip (keyboard focusable). The hit area grows to 44 px on coarse pointers.
 * Use for sign conventions and one-line definitions.
 */
export function InfoTip({ children, label = 'Keterangan', side = 'top', tone = 'page', className }: InfoTipProps) {
  return (
    <Tooltip content={children} side={side} tone={tone} className={className}>
      <button
        type="button"
        aria-label={label}
        className={cx(
          "relative inline-flex size-4 items-center justify-center rounded-xs transition-ui after:absolute after:-inset-3 after:content-[''] pointer-coarse:after:-inset-3.5",
          tone === 'stage' ? 'text-stage-ink-2 hover:text-stage-ink' : 'text-ink-3 hover:text-ink',
        )}
      >
        <InfoIcon size={16} />
      </button>
    </Tooltip>
  );
}
