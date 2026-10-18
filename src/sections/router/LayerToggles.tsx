import { cx } from '../../ui';
import { LAYER_LABEL, type LayerId } from './RouterDiagram';

const ORDER: LayerId[] = ['termal', 'listrik', 'udara'];

export default function LayerToggles({ layers, onToggle, className }: { layers: Record<LayerId, boolean>; onToggle: (id: LayerId) => void; className?: string }) {
  return (
    <div role="group" aria-label="Lapisan diagram" className={cx('flex items-center gap-1', className)}>
      {ORDER.map((id) => {
        const on = layers[id];
        return (
          <button
            key={id}
            type="button"
            aria-pressed={on}
            onClick={() => onToggle(id)}
            className={cx(
              'inline-flex min-h-9 items-center gap-2 rounded-sm px-3 text-ui transition-ui pointer-coarse:min-h-11',
              on ? 'text-ink underline decoration-ink decoration-1 underline-offset-[6px]' : 'text-ink-3 hover:text-ink',
            )}
          >
            {LAYER_LABEL[id]}
          </button>
        );
      })}
    </div>
  );
}
