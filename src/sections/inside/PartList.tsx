import { SISTEM_DALAM } from '../../content/sistem';
import { PARTS, type PartId, type PartValue } from '../../viz3d/parts';
import type { StageStore } from '../../viz3d/stage';
import { UnitText } from './UnitText';

/**
 * Mobile / no-WebGL companion of the stage annotations: four plain text buttons (no pills) in a two-column grid,
 * then the selected part's ONE sentence and ONE live value on the graphite chapter.
 */
export function PartList({ store, focus, valueOf }: { store: StageStore; focus: PartId | null; valueOf: (id: PartId) => PartValue }) {
  const sel = PARTS.find((p) => p.id === focus) ?? null;
  const v = sel ? valueOf(sel.id) : null;
  return (
    <div className="mt-4">
      <div role="group" aria-label={SISTEM_DALAM.listLabel} className="grid grid-cols-2 gap-x-6">
        {PARTS.map((p) => {
          const on = p.id === focus;
          return (
            <button
              key={p.id}
              type="button"
              aria-pressed={on}
              onClick={() => store.getState().setFocusPart(on ? null : p.id)}
              className={`min-h-11 border-b-2 text-left text-body transition-colors duration-150 ${
                on ? 'border-ink text-ink' : 'border-transparent text-ink-2 hover:text-ink'
              }`}
            >
              <span className="num mr-2 text-mono-label text-ink-3">{p.index}</span>
              {p.label}
            </button>
          );
        })}
      </div>
      <div aria-live="polite" className="mt-3 min-h-[3.5rem]">
        {sel && v ? (
          <>
            <p className="max-w-[48ch] text-body text-ink-2">{sel.sentence}</p>
            <p className="mono mt-1 text-mono-s text-ink-2">
              {v.symbol} <span className="font-medium text-ink">{v.value}</span> <UnitText unit={v.unit} />
            </p>
          </>
        ) : (
          <p className="text-body text-ink-3">{SISTEM_DALAM.emptyPick}</p>
        )}
      </div>
    </div>
  );
}
