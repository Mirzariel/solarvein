import { LABELS, type ControllerMode, type ModeTarget } from '../../sim/system';
import { cx, typo } from '../../ui';
import { modeMismatch } from './captions';

export interface Band {
  m: ModeTarget;
  /** Sentence keyed by the COMPUTED state at this preset. */
  sentence: string;
  computed: ControllerMode;
}

/**
 * Three bands = three condition presets. Each shows the sentence the router computes for it, so the text can
 * never promise a mode the controller does not reach. The active band carries the ink rule.
 */
export default function Bands({
  bands, active, onSelect, className,
}: { bands: Band[]; active: ModeTarget | 'custom'; onSelect: (m: ModeTarget) => void; className?: string }) {
  return (
    <ol className={cx('m-0 grid list-none grid-cols-3 gap-6 p-0', className)} aria-label="Tiga kondisi">
      {bands.map((b) => {
        const on = b.m === active;
        const mismatch = on ? modeMismatch(b.m, b.computed) : null;
        return (
          <li key={b.m} className="min-w-0">
            <button
              type="button"
              aria-pressed={on}
              onClick={() => onSelect(b.m)}
              className={cx('router-band block w-full border-t pt-3 text-left transition-ui', on ? 'border-ink border-t-2 -mt-px text-ink' : 'border-line-strong text-ink-3 hover:text-ink-2')}
            >
              <span className="flex items-baseline gap-3">
                <span className="num text-[13px]">{b.m}</span>
                <span className="text-ui">{LABELS.modeTarget[b.m]}</span>
              </span>
              <span className="mt-1 block text-body-s">{typo(b.sentence)}</span>
              {mismatch ? <span className="mt-1 block text-small text-ink-2">{typo(mismatch)}</span> : null}
            </button>
          </li>
        );
      })}
    </ol>
  );
}
