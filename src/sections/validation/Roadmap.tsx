import { DESICCANT_STATUS, LABELS } from '../../sim/system';
import { Subs } from '../../charts/impact/Waterfall';
import { useSystemStore } from '../../state/system';
import { useDesiccantSweep } from '../../state/systemSelectors';
import { EvidenceDot, formatId } from '../../ui';

const REGEN = [40, 45, 50, 55, 60];

interface Phase {
  n: string;
  title: string;
  line: string;
  measures: string;
}

const PHASES: readonly Phase[] = [
  { n: '1', title: 'Inti PV/T', line: 'Modul PV/T cair diuji di bawah matahari nyata.', measures: 'η_th pada suhu masuk sebenarnya, daya listrik dibanding PV biasa, suhu sel.' },
  { n: '2', title: 'Prapemanasan air', line: 'Modul disambung ke tangki penyangga dan penukar kalor.', measures: 'Fraksi surya air panas, rugi tangki, sisa panas selama hujan beberapa hari.' },
  { n: '3', title: 'Bahan desikan', line: 'Regenerasi diuji pada 40, 45, 50, 55, dan 60 °C.', measures: 'Serapan uap air per siklus, energi regenerasi, udara ambien dibanding udara buang.' },
  { n: '4', title: 'Perutean adaptif', line: 'Pengatur berbasis nilai dibandingkan dengan jadwal tetap.', measures: 'Panas terpakai dan panas di-bypass, jam pompa, nilai tambah saat panas berlebih.' },
  { n: '5', title: 'Karbon dan ekonomi', line: 'Data ukur menggantikan asumsi di buku besar.', measures: 'CO₂e bersih terhadap B1 sampai B4, biaya energi, balik modal.' },
];

/** Five phases, one line each plus what each one measures. Phase 3 carries the simulated verdict at its five set-points. */
export function Roadmap() {
  const sweep = useDesiccantSweep(undefined, REGEN);
  const regenAir = useSystemStore((s) => s.regenAir);
  return (
    <ol className="m-0 grid list-none gap-x-6 gap-y-0 p-0 sm:grid-cols-2 lg:grid-cols-5">
      {PHASES.map((p) => (
        <li key={p.n} className="flex flex-col border-t border-line-strong py-5 pr-2 lg:pr-4">
          <span className="num text-mono-s text-ink-3">Fase {p.n}</span>
          <h3 className="m-0 mt-2 text-[22px] font-medium leading-7 tracking-[-0.015em] text-ink">{p.title}</h3>
          <p className="m-0 mt-2 text-body text-ink">{p.line}</p>
          <p className="m-0 mt-3 text-small text-ink-2">
            <span className="text-ink">Mengukur: </span>
            <Subs text={p.measures} />
          </p>
          {p.n === '3' ? (
            <div className="mt-4">
              <p className="m-0 flex items-center gap-2 text-small text-ink-2">
                <EvidenceDot tag="hipotesis" />
                {DESICCANT_STATUS}
              </p>
              <ul className="num m-0 mt-2 list-none p-0 text-mono-label text-ink-3">
                {sweep.map((e) => (
                  <li key={e.regenC} className="flex justify-between gap-3 border-t border-dashed border-line py-1">
                    <span>{formatId(e.regenC, 0)} °C</span>
                    <span>{LABELS.verdict[e.verdict].toLowerCase()}</span>
                  </li>
                ))}
              </ul>
              <p className="m-0 mt-1 text-mono-label text-ink-3">Simulasi, udara regenerasi {regenAir === 'ambient' ? 'ambien' : 'buang hotel'}.</p>
            </div>
          ) : null}
        </li>
      ))}
    </ol>
  );
}
