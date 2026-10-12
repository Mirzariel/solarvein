import { useId, useState, type ReactNode } from 'react';
import { ChevronIcon } from './Icon';
import { cx } from './cx';

export interface DisclosureProps {
  title: ReactNode;
  /** Trailing hint, e.g. "Rumus, asumsi, batas model". */
  hint?: ReactNode;
  children: ReactNode;
  defaultOpen?: boolean;
  /** Controlled mode. */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Heading level wrapping the trigger button (for document outline). Default 3. */
  level?: 2 | 3 | 4;
  className?: string;
}

/**
 * Hairline disclosure row (48 px): title, optional hint, chevron. Content animates height via
 * grid-template-rows 0fr → 1fr (260 ms, ease-ui; reduced motion: instant). Stack several as direct
 * siblings: each draws a top rule and the last one closes with a bottom rule.
 * Closed content is `inert` (not focusable, not announced).
 */
export function Disclosure({ title, hint, children, defaultOpen = false, open, onOpenChange, level = 3, className }: DisclosureProps) {
  const [inner, setInner] = useState(defaultOpen);
  const isOpen = open ?? inner;
  const uid = useId();
  const Heading = `h${level}` as 'h2' | 'h3' | 'h4';
  const toggle = () => {
    const next = !isOpen;
    if (open === undefined) setInner(next);
    onOpenChange?.(next);
  };
  return (
    <div className={cx('border-t border-line last:border-b', className)}>
      <Heading className="m-0">
        <button
          type="button"
          id={`${uid}-btn`}
          aria-expanded={isOpen}
          aria-controls={`${uid}-panel`}
          onClick={toggle}
          className="group flex min-h-12 w-full items-center justify-between gap-4 rounded-xs py-2 text-left transition-ui hover:text-ink"
        >
          <span className="min-w-0 text-body font-medium text-ink">{title}</span>
          <span className="flex shrink-0 items-center gap-3">
            {hint ? <span className="hidden text-small text-ink-2 sm:inline">{hint}</span> : null}
            <ChevronIcon
              size={16}
              direction="down"
              className={cx('text-ink-2 transition-slide group-hover:text-ink', isOpen && 'rotate-180')}
            />
          </span>
        </button>
      </Heading>
      <div
        id={`${uid}-panel`}
        role="region"
        aria-labelledby={`${uid}-btn`}
        inert={!isOpen}
        className={cx(
          'grid transition-[grid-template-rows,opacity] duration-[260ms] ease-ui',
          isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0',
        )}
      >
        <div className="min-h-0 overflow-hidden">
          <div className="max-w-[64ch] pb-6 pt-1 text-body text-ink-2">{children}</div>
        </div>
      </div>
    </div>
  );
}
