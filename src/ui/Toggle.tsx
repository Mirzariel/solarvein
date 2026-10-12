import { useId } from 'react';
import { cx } from './cx';
import type { Accent } from './Slider';

export interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  /** One short line under the label. */
  description?: string;
  /** Ignored (chrome is neutral); accepted for compatibility. */
  accent?: Accent;
  disabled?: boolean;
  id?: string;
  className?: string;
}

/** Switch (role="switch"): 40×24 track, ink when on. Space/Enter toggles via native button behaviour. */
export function Toggle({ checked, onChange, label, description, disabled, id, className }: ToggleProps) {
  const auto = useId();
  const base = id ?? auto;
  const labelId = `${base}-label`;
  const descId = description ? `${base}-desc` : undefined;
  return (
    <div className={cx('flex items-start justify-between gap-4', disabled && 'opacity-40', className)}>
      <div className="min-w-0">
        <p id={labelId} className="text-body text-ink">
          {label}
        </p>
        {description ? (
          <p id={descId} className="mt-1 text-label text-ink-2">
            {description}
          </p>
        ) : null}
      </div>
      <button
        id={base}
        type="button"
        role="switch"
        aria-checked={checked}
        aria-labelledby={labelId}
        aria-describedby={descId}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cx(
          "group relative inline-flex h-6 w-10 shrink-0 items-center rounded-full border transition-ui after:absolute after:-inset-2 after:content-[''] pointer-coarse:after:-inset-3",
          checked ? 'border-ink bg-ink' : 'border-line-strong bg-sunken hover:border-ink-3',
          disabled ? 'cursor-not-allowed' : 'cursor-pointer',
        )}
      >
        <span
          aria-hidden="true"
          className={cx(
            'inline-block size-4 rounded-full shadow-thumb transition-slide group-active:scale-95',
            checked ? 'translate-x-[19px] bg-surface' : 'translate-x-[3px] bg-surface',
          )}
        />
      </button>
    </div>
  );
}
