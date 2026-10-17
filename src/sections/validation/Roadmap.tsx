import { DESICCANT_STATUS } from '../../sim/system';
import { Subs } from '../../charts/impact/Waterfall';
import { EvidenceDot } from '../../ui';

interface Phase {
  n: string;
  title: string;
  /** One line: what is tested and what it measures. */
  line: string;
}

const PHASES: readonly Phase[] = [
  { n: '1', title: 'Inti PV/T', line: 'Satu modul di bawah matahari: η_th, daya listrik, suhu sel.' },
  { n: '2', title: 'Prapemanasan air', line: 'Modul, tangki, penukar kalor: fraksi surya, rugi tangki, hujan beberapa hari.' },
  { n: '3', title: 'Bahan desikan', line: 'Regenerasi pada 40, 45, 50, 55, 60 °C: serapan uap air, energi regenerasi.' },
  { n: '4', title: 'Perutean adaptif', line: 'Router berbasis nilai terhadap jadwal tetap: panas terpakai, jam pompa.' },
  { n: '5', title: 'Karbon dan ekonomi', line: 'Data ukur menggantikan asumsi di tabel emisi di Dampak.' },
];

/** Five phases, one line each (what is tested and what it measures). The simulated verdict per set-point lives in the desiccant risk row. */
export function Roadmap() {
  return (
    <ol className="m-0 grid list-none gap-x-6 gap-y-0 p-0 sm:grid-cols-2 lg:grid-cols-5">
      {PHASES.map((p) => (
        <li key={p.n} className="flex flex-col border-t border-line-strong py-5 pr-2 lg:pr-4">
          <span className="num text-mono-s text-ink-3">Fase {p.n}</span>
          <h3 className="m-0 mt-2 text-[22px] font-medium leading-7 tracking-[-0.015em] text-ink">{p.title}</h3>
          <p className="m-0 mt-2 text-body text-ink-2"><Subs text={p.line} /></p>
          {p.n === '3' ? (
            <p className="m-0 mt-3 flex items-center gap-2 text-small text-ink-2">
              <EvidenceDot tag="hipotesis" />
              {DESICCANT_STATUS}
            </p>
          ) : null}
        </li>
      ))}
    </ol>
  );
}
