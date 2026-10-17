import { DESICCANT_STATUS, LABELS } from '../../sim/system';
import { SISTEM } from '../../content/sistem';
import { useStep } from '../../state/systemSelectors';
import { Disclosure, EvidenceDot, cx } from '../../ui';
import { LiveReadout } from './LiveReadout';

/**
 * L2 "Detail": the rest of the instruments of the current step, the three controller rules with the active one
 * marked, the desiccant status, and why the mode letter is computed. Everything reads the v2 DayStep.
 */
export function DetailPanel() {
  const step = useStep();
  const active = step.router.mode;
  return (
    <Disclosure title={SISTEM.detail.title} hint={SISTEM.detail.hint} level={3}>
      <div className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3">
        <LiveReadout label="Cairan masuk" idle select={(s) => s.collector.inletC} digits={1} unit="°C" kind="temperature" size="sm" />
        <LiveReadout label="Cairan keluar" idle select={(s) => s.collector.outletC} digits={1} unit="°C" kind="temperature" size="sm" />
        <LiveReadout label="Suhu sel" select={(s) => s.collector.cellC} digits={1} unit="°C" kind="temperature" size="sm" />
        <LiveReadout label="Sinar di bidang panel" select={(s) => s.climate.irradiance} unit="W/m²" kind="neutral" size="sm" />
        <LiveReadout label="Daya pompa" select={(s) => s.collector.pumpW / 1000} digits={2} unit="kW" kind="electrical" size="sm" />
        <LiveReadout label="Tangki: isi" select={(s) => s.tank.soc * 100} unit="%" kind="neutral" size="sm" sublabel={`atas ${Math.round(step.tank.topC)} °C`} />
      </div>

      <div className="mt-6 border-t border-line pt-4">
        <p className="text-label text-ink">{SISTEM.computedLabel}</p>
        <p className="mt-2 text-small">{SISTEM.note}</p>
        <ul className="mt-3 space-y-2 text-small">
          {SISTEM.rules.map((r) => (
            <li key={r.k} className={cx('flex gap-3', r.k === active ? 'text-ink' : 'text-ink-2')} aria-current={r.k === active ? 'true' : undefined}>
              <span className={cx('num w-4 shrink-0', r.k === active && 'text-heat-ink')}>{r.k}</span>
              <span>
                <span className="sr-only">{LABELS.mode[r.k]}. </span>
                {r.t}
              </span>
            </li>
          ))}
        </ul>
      </div>

      <p className="mt-6 flex items-center gap-2 border-t border-line pt-4 text-small">
        <EvidenceDot tag="hipotesis" />
        <span>
          Desikan (bahan penyerap uap air): <span className="text-ink">{DESICCANT_STATUS}</span>.
        </span>
      </p>
    </Disclosure>
  );
}
