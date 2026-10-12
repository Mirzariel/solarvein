import { useSimResult } from '../../state/selectors';
import { Disclosure, InfoIcon, WarningIcon } from '../../ui';
import { LiveReadout } from './LiveReadout';
import { describeRegime } from './regime';

/**
 * L2 "Detail": the rest of the instruments (all live on the visual frame), every advisory verbatim from the model
 * (the verbatim not-beneficial sentence is the statement itself, so it is not repeated), and the rule that decides
 * the heat direction. Rendered on the dark band through the stage colour scope.
 */
export function DetailPanel() {
  const committed = useSimResult();
  const statement = describeRegime(committed);
  const advisories = committed.advisories.filter(
    (a) => !(statement.key === 'not-beneficial' && a.code === 'REJECTION_NOT_BENEFICIAL'),
  );

  return (
    <Disclosure title="Detail" hint="Suhu, pompa, catatan sistem" level={3}>
      <div className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3 lg:grid-cols-2">
        <LiveReadout label="Cairan masuk" select={(r) => r.inletC} digits={1} unit="°C" kind="temperature" size="sm" tone="page" />
        <LiveReadout label="Cairan keluar" select={(r) => r.outletC} digits={1} unit="°C" kind="temperature" size="sm" tone="page" />
        <LiveReadout label="Suhu sel" select={(r) => r.cellC} digits={1} unit="°C" kind="temperature" size="sm" tone="page" />
        <LiveReadout label="Sinar matahari" select={(r) => r.inputs.irradiance} unit="W/m²" kind="neutral" size="sm" tone="page" />
        <LiveReadout label="Daya pompa" select={(r) => r.pumpW} digits={1} unit="W" kind="electrical" size="sm" tone="page" />
        <LiveReadout label="Listrik bersih" select={(r) => r.netElectricalW} unit="W" kind="electrical" size="sm" tone="page" sublabel="PV dikurangi pompa" />
      </div>

      {advisories.length > 0 ? (
        <ul className="mt-6 space-y-3" aria-label="Catatan sistem">
          {advisories.map((a) => (
            <li key={a.code} className="flex items-start gap-3 text-small">
              <span className="mt-0.5 shrink-0 text-ink-2">
                {a.severity === 'info' ? <InfoIcon size={16} /> : <WarningIcon size={16} />}
              </span>
              <span>
                <span className="sr-only">{a.severity === 'info' ? 'Info' : a.severity === 'warning' ? 'Peringatan' : 'Kritis'}: </span>
                {a.message}
              </span>
            </li>
          ))}
        </ul>
      ) : null}

      <div className="mt-6 border-t border-line pt-4">
        <p className="text-label text-ink">Kapan arah panas berbalik</p>
        <dl className="mt-2 space-y-2 text-small">
          <div>
            <dt className="inline text-ink">Panen panas: </dt>
            <dd className="inline">sel lebih panas dari cairan dan ada beban panas.</dd>
          </div>
          <div>
            <dt className="inline text-ink">Buang panas: </dt>
            <dd className="inline">cairan jauh lebih hangat dari sel dan ada sumber panas yang nyata.</dd>
          </div>
          <div>
            <dt className="inline text-ink">Selain itu: </dt>
            <dd className="inline">panas tidak dihitung sebagai manfaat (tanpa beban atau sumber panas, atau pertukarannya terlalu kecil). Bila pembuangan tidak sepadan: Pendinginan tidak menguntungkan pada kondisi ini.</dd>
          </div>
        </dl>
      </div>
    </Disclosure>
  );
}
