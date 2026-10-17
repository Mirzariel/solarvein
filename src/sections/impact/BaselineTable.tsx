import { LABELS, type BaselineComparison, type BaselineId } from '../../sim/system';
import { Evidence, cx, formatId } from '../../ui';
import { capexRange, idrSigned, paybackCells, tonSigned } from './format';

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
 * Carbon and money side by side, one row per baseline, same sign convention in both columns (+ = SolarVein better),
 * so opposite directions show as opposite bars. From md: a table; below: one stacked block per baseline (no clipping).
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

  const info = (id: BaselineId) => {
    const led = data.ledgers[id];
    const eco = data.economics[id];
    const cells = paybackCells(eco.paybackYears);
    const none = cells.every((c) => c.years === null);
    const opposite = Math.abs(led.netKgPerYear) > 25 && Math.abs(eco.annualSavingIdr) > 1000 && Math.sign(led.netKgPerYear) !== Math.sign(eco.annualSavingIdr);
    const payback = none ? (
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
    );
    return { led, eco, opposite, payback };
  };

  const nameBtn = (id: BaselineId, on: boolean) => (
    <button
      type="button"
      aria-pressed={on}
      onClick={() => onSelect(id)}
      className={cx('text-left text-body transition-ui hover:text-ink', on ? 'font-medium text-ink' : 'text-ink-2')}
    >
      <span className="num mr-2 text-mono-s">{id}</span>
      {LABELS.baseline[id]}
    </button>
  );
  const notes = (id: BaselineId, opposite: boolean) => (
    <>
      {id === 'B2' || id === 'B4' ? <span className="mt-0.5 block text-small text-ink-3">pembanding terkuat</span> : null}
      {opposite ? <span className="mt-0.5 block text-small text-ink-2">karbon dan biaya berlawanan arah</span> : null}
    </>
  );

  return (
    <div>
      {/* md+: table */}
      <div className="hidden md:block">
        <table className="w-full border-collapse text-left">
          <caption className="sr-only">Karbon dan biaya SolarVein dibanding empat pembanding</caption>
          <thead>
            <tr className="align-bottom text-label text-ink-2">
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
              const { led, eco, opposite, payback } = info(id);
              const on = id === selected;
              return (
                <tr key={id} className={cx('border-t align-top', on ? 'border-ink' : 'border-line')}>
                  <th scope="row" className="py-3.5 pr-4 text-left font-normal">
                    {nameBtn(id, on)}
                    {notes(id, opposite)}
                  </th>
                  <td className="py-3.5 pr-4">
                    <span className="num text-mono-s text-ink">{tonSigned(led.netKgPerYear, 2)}</span>
                    <DivBar value={led.netKgPerYear} max={maxC} />
                  </td>
                  <td className="py-3.5 pr-4">
                    <span className="num whitespace-nowrap text-mono-s text-ink">{idrSigned(eco.annualSavingIdr)}</span>
                    <DivBar value={eco.annualSavingIdr} max={maxM} />
                  </td>
                  <td className="num py-3.5 pr-4 text-mono-s text-ink-2">{capexRange(eco.capexIdr[0], eco.capexIdr[2])}</td>
                  <td className="py-3.5">{payback}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* below md: one block per baseline */}
      <ul className="m-0 list-none p-0 md:hidden">
        {IDS.map((id) => {
          const { led, eco, opposite, payback } = info(id);
          const on = id === selected;
          return (
            <li key={id} className={cx('border-t py-4', on ? 'border-ink' : 'border-line')}>
              <div>
                {nameBtn(id, on)}
                {notes(id, opposite)}
              </div>
              <dl className="m-0 mt-3 grid grid-cols-2 gap-x-4 gap-y-3 text-small">
                <div>
                  <dt className="text-ink-2">CO₂e bersih, t/tahun</dt>
                  <dd className="m-0">
                    <span className="num text-mono-s text-ink">{tonSigned(led.netKgPerYear, 2)}</span>
                    <DivBar value={led.netKgPerYear} max={maxC} />
                  </dd>
                </div>
                <div>
                  <dt className="text-ink-2">Selisih biaya energi, per tahun</dt>
                  <dd className="m-0">
                    <span className="num text-mono-s text-ink">{idrSigned(eco.annualSavingIdr)}</span>
                    <DivBar value={eco.annualSavingIdr} max={maxM} />
                  </dd>
                </div>
                <div>
                  <dt className="text-ink-2">Biaya pasang tambahan</dt>
                  <dd className="num m-0 text-mono-s text-ink-2">{capexRange(eco.capexIdr[0], eco.capexIdr[2])}</dd>
                </div>
                <div>
                  <dt className="text-ink-2">Balik modal, tahun</dt>
                  <dd className="m-0">{payback}</dd>
                </div>
              </dl>
            </li>
          );
        })}
      </ul>
      <p className="mt-3 max-w-[68ch] text-small text-ink-2">
        Plus = SolarVein lebih baik. Balik modal di atas umur pakai (<span className="num">{formatId(lifetimeYears, 0)}</span> tahun) berarti tidak balik modal dalam praktik. Biaya: asumsi rekayasa{' '}
        <Evidence tag="asumsi" />.
      </p>
    </div>
  );
}
