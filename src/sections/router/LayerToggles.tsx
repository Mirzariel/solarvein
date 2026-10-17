import { cx } from '../../ui';
import { LAYER_LABEL, type LayerId } from './RouterDiagram';

const ORDER: LayerId[] = ['termal', 'listrik', 'udara'];
/** The dot shows the medium the layer draws: amber = heat in liquid, ink = electricity, cool = dehumidified air. */
const DOT: Record<LayerId, string> = { termal: 'bg-heat', listrik: 'bg-ink', udara: 'bg-cool' };

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
              on ? 'text-ink' : 'text-ink-3 hover:text-ink',
            )}
          >
            <span
              aria-hidden="true"
              className={cx('size-1.5 rounded-full border border-ink-3', on ? cx(DOT[id], 'border-transparent') : 'bg-transparent')}
            />
            {LAYER_LABEL[id]}
          </button>
        );
      })}
    </div>
  );
}
