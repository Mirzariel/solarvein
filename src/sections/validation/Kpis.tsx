import type { ReactNode } from 'react';
import { Subs } from '../../charts/impact/Waterfall';
import { useBaselines, useSystem, useYear } from '../../state/systemSelectors';
import { Evidence, formatId, formatSigned } from '../../ui';
import { paybackCells, tonSigned } from '../impact/format';

interface Kpi {
  name: ReactNode;
  unit: string;
  sim: ReactNode;
  phase: string;
}

/** KPIs: what is measured, in which unit, today's simulated value (from the hooks, never typed in) and the phase that replaces it with data. */
export function Kpis() {
  const data = useBaselines();
  const sys = useSystem();
  const year = useYear(sys.controller.strategy);
  const t = year.totals;
  const pvDiff = data.ledgers.B2.rows.find((r) => r.id === 'listrik-pv')?.energy?.kWhE;
  const pvPct = pvDiff !== undefined ? (pvDiff / (t.pvKWhE - pvDiff)) * 100 : null;
  const pb = paybackCells(data.economics.B2.paybackYears);
  const noPayback = pb.every((c) => c.years === null);

  const rows: Kpi[] = [
    { name: 'CO₂e bersih terhadap B2 (juga B1, B3, B4)', unit: 't CO₂e/tahun', sim: tonSigned(data.ledgers.B2.netKgPerYear, 2), phase: '5' },
    { name: 'Fraksi surya air panas, tahunan', unit: '%', sim: formatId(t.solarFraction * 100, 0), phase: '2' },
    { name: 'Daya listrik PV/T dibanding PV biasa', unit: '%', sim: pvPct === null ? '—' : formatSigned(pvPct, 1), phase: '1' },
    { name: 'Efisiensi termal η_th pada suhu masuk sebenarnya', unit: '-', sim: 'dari model, tidak tetap', phase: '1' },
    { name: 'Permintaan air panas tak terpenuhi', unit: 'kWh_th/tahun', sim: formatId(t.unmetKWhTh, 0), phase: '2' },
    { name: 'Balik modal terhadap B2', unit: 'tahun', sim: noPayback ? 'tidak balik modal' : pb.map((c) => c.text).join(' / '), phase: '5' },
    { name: 'Hemat listrik AC dari desikan', unit: 'kWh_e/tahun', sim: 'belum diukur; router menghitungnya terpisah', phase: '3' },
  ];

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[36rem] border-collapse text-left">
        <caption className="sr-only">Indikator kinerja utama, nilai simulasi saat ini, dan fase yang mengukurnya</caption>
        <thead>
          <tr className="text-label text-ink-2">
            <th scope="col" className="py-2 pr-4 font-normal">Indikator</th>
            <th scope="col" className="py-2 pr-4 font-normal">Satuan</th>
            <th scope="col" className="py-2 pr-4 font-normal">
              Nilai simulasi sekarang <Evidence tag="simulasi" />
            </th>
            <th scope="col" className="py-2 text-right font-normal">Diukur di fase</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-t border-line align-baseline">
              <th scope="row" className="py-3 pr-4 text-left text-body font-normal text-ink">
                <Subs text={String(r.name)} />
              </th>
              <td className="num py-3 pr-4 text-mono-label text-ink-3">
                <Subs text={r.unit} />
              </td>
              <td className="num py-3 pr-4 text-mono-s text-ink">{r.sim}</td>
              <td className="num py-3 text-right text-mono-s text-ink-2">{r.phase}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
