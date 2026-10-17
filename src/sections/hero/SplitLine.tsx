import { LABELS, type Sink } from '../../sim/system';
import { SISTEM } from '../../content/sistem';
import { useRouterSnapshot } from '../../state/systemSelectors';
import { cx } from '../../ui';
import { SINK_ORDER, splitShares } from './regime';

const SEG: Record<Sink, { page: string; stage: string }> = {
  // delivered = solid amber; stored = lighter amber (the tank's fill); not validated = dashed outline; unused = grey
  dhw: { page: 'bg-heat-mark', stage: 'bg-stage-heat' },
  tank: { page: 'bg-heat-mark/45', stage: 'bg-stage-heat/45' },
  desiccant: { page: 'border border-dashed border-ink-3', stage: 'border border-dashed border-stage-ink-2' },
  bypass: { page: 'bg-loss', stage: 'bg-stage-line' },
};

/**
 * One line that says where the heat goes right now: four shares (air panas / tangki / desikan / tidak dipakai),
 * from the router allocation of the current step, with a proportional hairline bar. Form encodes destination:
 * solid = delivered, light = stored, dashed = desiccant (research hypothesis), grey = unused. Pump off: no flow.
 */
export function SplitLine({ tone = 'stage', className }: { tone?: 'stage' | 'page'; className?: string }) {
  const snap = useRouterSnapshot();
  const shares = splitShares(snap.allocW);
  const stage = tone === 'stage';
  return (
    <div className={className} role="group" aria-label={`${SISTEM.splitLabel}: ${shares ? SINK_ORDER.map((k) => `${SISTEM.split[k]} ${shares[k]} persen`).join(', ') : 'tidak ada aliran panas'}`}>
      <div className={cx('flex items-baseline justify-between gap-4 text-label', stage ? 'text-stage-ink-2' : 'text-ink-2')}>
        <span aria-hidden="true">{SISTEM.splitLabel}</span>
        {shares ? null : <span aria-hidden="true">{snap.pumpOn ? '' : 'Pompa mati: tidak ada aliran'}</span>}
      </div>
      <div aria-hidden="true" className={cx('mt-2 flex h-1.5 gap-px overflow-hidden rounded-full', stage ? 'bg-stage-line/60' : 'bg-line')}>
        {SINK_ORDER.map((k) => (
          <span
            key={k}
            className={cx('block h-full min-w-0 rounded-full transition-[flex-grow] duration-[400ms] ease-ui', SEG[k][stage ? 'stage' : 'page'])}
            style={{ flexGrow: shares ? shares[k] : 0, flexBasis: 0 }}
          />
        ))}
      </div>
      <dl aria-hidden="true" className="mt-3 grid grid-cols-2 gap-x-6 gap-y-2 sm:grid-cols-4">
        {SINK_ORDER.map((k) => (
          <div key={k} title={LABELS.sink[k]}>
            <dt className={cx('text-label', stage ? 'text-stage-ink-2' : 'text-ink-2')}>{SISTEM.split[k]}</dt>
            <dd className={cx('num m-0 text-readout-m', stage ? 'text-stage-ink' : 'text-ink')}>
              {shares ? shares[k] : '–'}
              <span className={cx('ml-1 text-mono-s', stage ? 'text-stage-ink-2' : 'text-ink-2')}>%</span>
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
