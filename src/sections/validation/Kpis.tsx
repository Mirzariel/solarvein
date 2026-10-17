import type { ReactNode } from 'react';
import { Subs } from '../../charts/impact/Waterfall';
import { useBaselines, useSystem, useYear } from '../../state/systemSelectors';
import { Evidence, formatId, formatSigned } from '../../ui';
import { paybackCells, tonSigned } from '../impact/format';

interface Kpi {
  name: string;
  unit: string;
  sim: ReactNode;
  phase: string;
}

/**
 * KPIs: what is measured, its unit, the phase that replaces the simulation with data, and today's simulated value
 * (read from the hooks, never typed in). Stacked rows that wrap, so nothing clips on a phone.
 */
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
    { name: 'Efisiensi termal η_th pada suhu masuk sebenarnya', unit: '-', sim: 'dari model', phase: '1' },
    { name: 'Permintaan air panas tidak terpenuhi', unit: 'kWh_th/tahun', sim: formatId(t.unmetKWhTh, 0), phase: '2' },
    { name: 'Balik modal terhadap B2', unit: 'tahun', sim: noPayback ? 'tidak balik modal' : pb.map((c) => c.text).join(' / '), phase: '5' },
    { name: 'Hemat listrik AC dari desikan', unit: 'kWh_e/tahun', sim: 'belum diukur', phase: '3' },
  ];

  return (
    <div>
      <p className="m-0 mb-1 flex items-center gap-2 text-label text-ink-2">
        Nilai simulasi sekarang <Evidence tag="simulasi" />
      </p>
      <ul className="m-0 list-none p-0">
        {rows.map((r, i) => (
          <li key={i} className="grid grid-cols-[minmax(0,1fr)_minmax(0,auto)] items-baseline gap-x-6 gap-y-1 border-t border-line py-3">
            <div className="min-w-0">
              <p className="m-0 text-body text-ink">
                <Subs text={r.name} />
              </p>
              <p className="num m-0 text-mono-label text-ink-3">
                <Subs text={r.unit} /> · fase {r.phase}
              </p>
            </div>
            <p className="num m-0 max-w-[15rem] text-right text-mono-s text-ink [overflow-wrap:anywhere]">{r.sim}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
