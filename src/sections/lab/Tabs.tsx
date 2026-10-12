import { useId, useRef, type KeyboardEvent, type ReactNode } from 'react';
import { cx } from '../../ui';

export interface TabSpec<T extends string> {
  id: T;
  label: string;
}

/** Tab hairline (WAI-ARIA tabs): panah kiri/kanan memindah dan memilih, Home/End melompat. Hanya panel aktif di-render. */
export function Tabs<T extends string>({
  tabs,
  value,
  onChange,
  ariaLabel,
  actions,
  children,
}: {
  tabs: readonly TabSpec<T>[];
  value: T;
  onChange: (v: T) => void;
  ariaLabel: string;
  /** Kontrol di kanan baris tab (mis. Pita | Batang). */
  actions?: ReactNode;
  children: ReactNode;
}) {
  const uid = useId();
  const refs = useRef<Array<HTMLButtonElement | null>>([]);
  const idx = Math.max(0, tabs.findIndex((t) => t.id === value));
  const go = (to: number) => {
    const i = ((to % tabs.length) + tabs.length) % tabs.length;
    const t = tabs[i];
    if (!t) return;
    onChange(t.id);
    refs.current[i]?.focus();
  };
  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'ArrowRight') (e.preventDefault(), go(idx + 1));
    else if (e.key === 'ArrowLeft') (e.preventDefault(), go(idx - 1));
    else if (e.key === 'Home') (e.preventDefault(), go(0));
    else if (e.key === 'End') (e.preventDefault(), go(tabs.length - 1));
  };
  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3 border-b border-line">
        <div role="tablist" aria-label={ariaLabel} onKeyDown={onKey} className="-mb-px flex gap-6 overflow-x-auto">
          {tabs.map((t, i) => {
            const on = t.id === value;
            return (
              <button
                key={t.id}
                ref={(el) => {
                  refs.current[i] = el;
                }}
                id={`${uid}-tab-${t.id}`}
                role="tab"
                type="button"
                aria-selected={on}
                aria-controls={`${uid}-panel`}
                tabIndex={on ? 0 : -1}
                onClick={() => onChange(t.id)}
                className={cx(
                  'min-h-12 whitespace-nowrap border-b-2 text-button transition-ui',
                  on ? 'border-ink text-ink' : 'border-transparent text-ink-2 hover:text-ink',
                )}
              >
                {t.label}
              </button>
            );
          })}
        </div>
        {actions ? <div className="pb-2">{actions}</div> : null}
      </div>
      <div id={`${uid}-panel`} role="tabpanel" aria-labelledby={`${uid}-tab-${value}`} className="pt-8">
        {children}
      </div>
    </div>
  );
}
