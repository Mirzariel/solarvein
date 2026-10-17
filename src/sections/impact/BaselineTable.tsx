import { LABELS, type BaselineComparison, type BaselineId } from '../../sim/system';
import { Evidence, cx, formatId } from '../../ui';
import { idr, idrSigned, paybackCells, tonSigned } from './format';

const IDS: readonly BaselineId[] = ['B1', 'B2', 'B3', 'B4'];

/** Centre-zero bar, transform only: right = SolarVein better, left = baseline better. */
function DivBar({ value, max }: { value: number; max: number }) {
  const f = max > 0 ? Math.min(1, Math.abs(value) / max) : 0;
  return (
    <span aria-hidden="true" className="relative mt-1.5 block h-1.5 w-full max-w-[9rem]">
      <span className="absolute inset-y-0 left-1/2 w-px bg-line-strong" />
      <span
        className={cx('absolute inset-y-0 left-1/2 w-1/2', value >= 0 ? 'origin-left bg-ink' : 'origin-right bg-ink-3/50')}
        style={{ transform: `${value >= 0 ? '' : 'translateX(-100%) '}scaleX(${Math.max(f, 0.012)})` }}
      />
    </span>
  );
}

/**
 * Carbon and money side by side, one row per baseline. Both columns use the same sign convention
 * (+ = SolarVein better), so opposite directions show as opposite bars. Payback: low / mid / high capex.
 */
export function BaselineTable({
  data,
  selected,
  onSelect,
  lifetimeYears,
}: {
  data: BaselineComparison;
  selected: BaselineId;
  onSelect: (id: BaselineId) => void;
  lifetimeYears: number;
}) {
  const maxC = Math.max(...IDS.map((id) => Math.abs(data.ledgers[id].netKgPerYear)), 1);
  const maxM = Math.max(...IDS.map((id) => Math.abs(data.economics[id].annualSavingIdr)), 1);
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[44rem] border-collapse text-left">
        <caption className="sr-only">Karbon dan biaya SolarVein dibanding empat pembanding</caption>
        <thead>
          <tr className="text-label text-ink-2">
            <th scope="col" className="w-[26%] py-2 pr-4 font-normal">Pembanding</th>
            <th scope="col" className="py-2 pr-4 font-normal">CO₂e bersih, t/tahun</th>
            <th scope="col" className="py-2 pr-4 font-normal">
              Selisih biaya energi, per tahun <Evidence tag="asumsi" />
            </th>
            <th scope="col" className="py-2 pr-4 font-normal">Biaya pasang tambahan</th>
            <th scope="col" className="py-2 font-normal">Balik modal, tahun (biaya pasang rendah / tengah / tinggi)</th>
          </tr>
        </thead>
        <tbody>
          {IDS.map((id) => {
            const led = data.ledgers[id];
            const eco = data.economics[id];
            const cells = paybackCells(eco.paybackYears);
            const none = cells.every((c) => c.years === null);
            const opposite = Math.abs(led.netKgPerYear) > 25 && Math.abs(eco.annualSavingIdr) > 1000 && Math.sign(led.netKgPerYear) !== Math.sign(eco.annualSavingIdr);
            const on = id === selected;
            return (
              <tr key={id} className={cx('border-t align-top', on ? 'border-ink' : 'border-line')}>
                <th scope="row" className="py-3.5 pr-4 text-left font-normal">
                  <button
                    type="button"
                    aria-pressed={on}
                    onClick={() => onSelect(id)}
                    className={cx('text-left text-body transition-ui hover:text-ink', on ? 'font-medium text-ink' : 'text-ink-2')}
                  >
                    <span className="num mr-2 text-mono-s">{id}</span>
                    {LABELS.baseline[id]}
                  </button>
                  {id === 'B2' ? <span className="mt-0.5 block text-small text-ink-3">pembanding utama yang jujur</span> : null}
                  {opposite ? <span className="mt-0.5 block text-small text-ink-2">karbon dan biaya berlawanan arah</span> : null}
                </th>
                <td className="py-3.5 pr-4">
                  <span className="num text-mono-s text-ink">{tonSigned(led.netKgPerYear, 2)}</span>
                  <DivBar value={led.netKgPerYear} max={maxC} />
                </td>
                <td className="py-3.5 pr-4">
                  <span className="num text-mono-s text-ink">{idrSigned(eco.annualSavingIdr)}</span>
                  <DivBar value={eco.annualSavingIdr} max={maxM} />
                </td>
                <td className="num py-3.5 pr-4 text-mono-s text-ink-2">
                  {idr(eco.capexIdr[0]).replace('Rp', '')}–{idr(eco.capexIdr[2])}
                </td>
                <td className="py-3.5">
                  {none ? (
                    <span className="text-body text-ink">tidak balik modal</span>
                  ) : (
                    <span className="num text-mono-s text-ink">
                      {cells.map((c, i) => (
                        <span key={i} className={cx(c.years === null || c.years > lifetimeYears ? 'text-ink-3' : undefined)}>
                          {i > 0 ? ' / ' : ''}
                          {c.text}
                        </span>
                      ))}
                    </span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <p className="mt-3 max-w-[68ch] text-small text-ink-2">
        Plus = SolarVein lebih baik. Balik modal di atas umur pakai (<span className="num">{formatId(lifetimeYears, 0)}</span> tahun) berarti tidak balik modal dalam praktik.
      </p>
    </div>
  );
}
