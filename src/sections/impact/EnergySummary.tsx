import type { AnnualResult, BaselineComparison } from '../../sim/system';
import { Evidence, formatId } from '../../ui';

function Line({ label, value, unit, note }: { label: string; value: string; unit: 'e' | 'th'; note?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-t border-line py-2.5">
      <dt className="min-w-0 text-body text-ink-2">
        {label}
        {note ? <span className="block text-small text-ink-3">{note}</span> : null}
      </dt>
      <dd className="num m-0 shrink-0 text-right text-mono-s text-ink">
        {value} <span className="text-ink-3">kWh<sub className="text-[0.7em]">{unit}</sub></span>
      </dd>
    </div>
  );
}

/**
 * Annual energy, electricity and heat kept apart. They meet only in CO₂e, through the factor printed under each
 * column (from the B1 ledger rows), never as a sum.
 */
export function EnergySummary({ year, data }: { year: AnnualResult; data: BaselineComparison }) {
  const t = year.totals;
  const rows = data.ledgers.B1.rows;
  const fE = rows.find((r) => r.id === 'listrik-pv')?.factor;
  const fTh = rows.find((r) => r.id === 'kalor-air-panas')?.factor;
  return (
    <div className="grid gap-x-12 gap-y-10 md:grid-cols-2">
      <div>
        <h4 className="m-0 text-h3 text-ink">
          Listrik <span className="num text-readout-m text-ink-3">kWh<sub className="text-[0.7em]">e</sub></span>
        </h4>
        <dl className="m-0 mt-4">
          <Line label="PV/T menghasilkan" value={formatId(t.pvKWhE, 0)} unit="e" />
          <Line label="Pompa dan pengendali memakai" value={formatId(-t.parasiticKWhE, 0)} unit="e" />
        </dl>
        {fE ? (
          <p className="num mt-3 text-mono-label text-ink-3">
            × {formatId(fE.value, 2)} {fE.unit.replace('_e', '')}
            <sub>e</sub> <Evidence tag="terbit" refId={fE.refId} />
          </p>
        ) : null}
      </div>
      <div>
        <h4 className="m-0 text-h3 text-ink">
          Panas <span className="num text-readout-m text-ink-3">kWh<sub className="text-[0.7em]">th</sub></span>
        </h4>
        <dl className="m-0 mt-4">
          <Line label="Terkumpul dari panel" value={formatId(t.collectedKWhTh, 0)} unit="th" />
          <Line label="Dipakai air panas" value={formatId(t.dhwSolarKWhTh, 0)} unit="th" note={`${formatId(t.solarFraction * 100, 0)}% dari kebutuhan ${formatId(t.dhwDemandKWhTh, 0)}`} />
          <Line label="Dibuang lewat bypass" value={formatId(t.bypassKWhTh, 0)} unit="th" />
          <Line label="Rugi diam tangki" value={formatId(t.tankLossKWhTh, 0)} unit="th" />
        </dl>
        {fTh ? (
          <p className="num mt-3 text-mono-label text-ink-3">
            × {formatId(fTh.value, 3)} {fTh.unit.replace('_th', '')}
            <sub>th</sub> <Evidence tag="terbit" refId={fTh.refId} />
          </p>
        ) : null}
      </div>
      <p className="m-0 max-w-[68ch] text-small text-ink-2 md:col-span-2">
        kWh<sub>e</sub> dan kWh<sub>th</sub> tidak dijumlahkan; keduanya bertemu hanya di CO₂e, lewat faktor di bawah tiap kolom. Kebutuhan air panas selalu terpenuhi: pemanas lama menutup sisanya, jadi permintaan tak terpenuhi nol.
      </p>
    </div>
  );
}
