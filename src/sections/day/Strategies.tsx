import { LABELS, type AnnualResult, type AreaSweepPoint, type RouterStrategy } from '../../sim/system';
import { useAreaSweep, useYear } from '../../state/systemSelectors';
import { ChartCard } from '../../charts/ChartCard';
import { Evidence, formatId } from '../../ui';
import { Val } from './units';

const STRATEGIES: readonly RouterStrategy[] = ['dhw-priority', 'fixed-schedule', 'adaptive'];
const AREAS = [85, 170, 340];
const EPS_KWH = 50; // below this a difference in annual kWh_th is not meaningful at this model's accuracy

/** Honest sentence about the three strategies, generated from the numbers (no default winner). */
export function strategySentence(dhw: AnnualResult, fixed: AnnualResult, adaptive: AnnualResult): string {
  const dA = adaptive.totals.dhwSolarKWhTh - dhw.totals.dhwSolarKWhTh;
  const toDesiccant = adaptive.totals.desiccantRegenKWhTh;
  const fixedLoss = dhw.totals.dhwSolarKWhTh - fixed.totals.dhwSolarKWhTh;
  const tail =
    fixedLoss > EPS_KWH
      ? ` Jadwal tetap mengirim panas ke desikan tanpa menimbang nilainya dan kehilangan ${formatId(fixedLoss, 0)} kWh_th air panas per tahun.`
      : '';
  if (Math.abs(dA) <= EPS_KWH && toDesiccant <= EPS_KWH) {
    return `Pada skala ini Adaptif sama dengan Air panas dulu: pengatur menolak desikan karena nilainya lebih rendah.${tail}`;
  }
  if (dA > EPS_KWH) {
    return `Adaptif menambah ${formatId(dA, 0)} kWh_th air panas per tahun dibanding Air panas dulu, dan mengirim ${formatId(toDesiccant, 0)} kWh_th ke desikan.${tail}`;
  }
  return `Adaptif mengirim ${formatId(toDesiccant, 0)} kWh_th ke desikan dan memasok ${formatId(Math.abs(dA), 0)} kWh_th air panas lebih sedikit daripada Air panas dulu.${tail}`;
}

/** Sentence for the area sweep. */
export function areaSentence(points: AreaSweepPoint[]): string {
  const by = (a: number, s: RouterStrategy) => points.find((p) => p.areaM2 === a && p.strategy === s);
  const big = Math.max(...points.map((p) => p.areaM2));
  const bigAd = by(big, 'adaptive');
  const bigDhw = by(big, 'dhw-priority');
  if (!bigAd || !bigDhw) return '';
  const same = points.every((p) => {
    if (p.strategy !== 'adaptive') return true;
    const d = by(p.areaM2, 'dhw-priority');
    return !d || Math.abs(d.dhwSolarKWhThPerYear - p.dhwSolarKWhThPerYear) <= EPS_KWH;
  });
  const unused = `Pada ${formatId(big, 0)} m² panas yang tidak terpakai mencapai ${formatId(bigAd.bypassKWhThPerYear, 0)} kWh_th per tahun`;
  return same
    ? `${unused}, tetapi Adaptif tetap tidak memilih desikan: surplus saja belum membuat desikan lebih bernilai daripada air panas.`
    : `${unused}; di luas yang lebih besar Adaptif mulai berbeda dari Air panas dulu.`;
}

function Bar({ frac, className, dashed }: { frac: number; className: string; dashed?: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={`block h-2 rounded-[2px] ${className} ${dashed ? 'border border-dashed border-ink-2 bg-transparent' : ''}`}
      style={{ width: `${Math.max(0, Math.min(1, frac)) * 100}%` }}
    />
  );
}

/** Annual comparison of the three strategies + area sweep. Both are simulation results; kWh_th only. */
export function Strategies() {
  const dhw = useYear('dhw-priority');
  const fixed = useYear('fixed-schedule');
  const adaptive = useYear('adaptive');
  const years: Record<RouterStrategy, AnnualResult> = { 'dhw-priority': dhw, 'fixed-schedule': fixed, adaptive };
  const sweep = useAreaSweep(AREAS, [...STRATEGIES]);

  const adaptivePts = AREAS.map((a) => sweep.find((p) => p.areaM2 === a && p.strategy === 'adaptive')).filter((p): p is AreaSweepPoint => !!p);
  const maxTotal = Math.max(1, ...adaptivePts.map((p) => p.dhwSolarKWhThPerYear + p.bypassKWhThPerYear));
  const maxDhw = Math.max(1, ...STRATEGIES.map((s) => years[s].totals.dhwSolarKWhTh));

  return (
    <div className="mt-16 grid gap-x-12 gap-y-14 lg:mt-24 lg:grid-cols-2">
      <ChartCard
        title="Tiga strategi, satu tahun"
        unit={<span className="inline-flex items-center gap-2"><Evidence tag="simulasi" /> kWh<sub>th</sub>/tahun</span>}
        subtitle="Panas surya yang sampai ke air panas, dan berapa yang dikirim ke desikan."
        footer={strategySentence(dhw, fixed, adaptive)}
      >
        <table className="w-full border-collapse text-left">
          <caption className="sr-only">Perbandingan strategi pengatur panas per tahun</caption>
          <thead>
            <tr className="text-label text-ink-2">
              <th scope="col" className="pb-2 pr-3 font-medium">Strategi</th>
              <th scope="col" className="pb-2 pr-3 text-right font-medium">Fraksi surya</th>
              <th scope="col" className="pb-2 pr-3 text-right font-medium">Ke air panas</th>
              <th scope="col" className="pb-2 text-right font-medium">Ke desikan</th>
            </tr>
          </thead>
          <tbody>
            {STRATEGIES.map((s) => {
              const t = years[s].totals;
              return (
                <tr key={s} className="border-t border-line align-top">
                  <th scope="row" className="py-3 pr-3 text-body font-normal text-ink">
                    {LABELS.strategy[s]}
                    <span className="mt-2 block w-full max-w-40">
                      <Bar frac={t.dhwSolarKWhTh / maxDhw} className="bg-heat-mark" />
                    </span>
                  </th>
                  <td className="num py-3 pr-3 text-right text-mono-s text-ink">{formatId(t.solarFraction * 100, 0)}%</td>
                  <td className="num py-3 pr-3 text-right text-mono-s text-ink">{formatId(t.dhwSolarKWhTh, 0)}</td>
                  <td className="num py-3 text-right text-mono-s text-ink">{formatId(t.desiccantRegenKWhTh, 0)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </ChartCard>

      <ChartCard
        title="Luas panel dan surplus"
        unit={<span className="inline-flex items-center gap-2"><Evidence tag="simulasi" /> strategi Adaptif, kWh<sub>th</sub>/tahun</span>}
        subtitle="Pada luas besar, panas yang tidak terpakai (bypass) cepat bertambah."
        footer={areaSentence(sweep)}
      >
        <ul className="m-0 list-none p-0">
          {adaptivePts.map((p) => {
            const dhwP = sweep.find((q) => q.areaM2 === p.areaM2 && q.strategy === 'dhw-priority');
            const diff = dhwP ? p.dhwSolarKWhThPerYear - dhwP.dhwSolarKWhThPerYear : 0;
            return (
              <li key={p.areaM2} className="grid grid-cols-[4.5rem_1fr] items-center gap-x-4 gap-y-1 border-t border-line py-3">
                <span className="num text-mono-s text-ink">
                  {formatId(p.areaM2, 0)} <span className="text-ink-2">m²</span>
                </span>
                <span className="flex h-2 w-full overflow-hidden rounded-[2px]" aria-hidden="true">
                  <span className="block h-full bg-heat-mark" style={{ width: `${(p.dhwSolarKWhThPerYear / maxTotal) * 100}%` }} />
                  <span className="block h-full bg-loss" style={{ width: `${(p.bypassKWhThPerYear / maxTotal) * 100}%` }} />
                </span>
                <span />
                <span className="flex flex-wrap items-baseline gap-x-4 gap-y-0.5 text-small text-ink-2">
                  <span>
                    air panas <Val v={p.dhwSolarKWhThPerYear} d={0} unit="" className="num text-ink" />
                  </span>
                  <span>
                    tidak terpakai <Val v={p.bypassKWhThPerYear} d={0} unit="" className="num text-ink" />
                  </span>
                  <span>
                    selisih vs Air panas dulu <Val v={diff} d={0} unit="" signed className="num text-ink" />
                  </span>
                </span>
              </li>
            );
          })}
        </ul>
        <p className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1 text-small text-ink-2">
          <span className="inline-flex items-center gap-2"><span aria-hidden="true" className="block size-2.5 rounded-[2px] bg-heat-mark" />ke air panas</span>
          <span className="inline-flex items-center gap-2"><span aria-hidden="true" className="block size-2.5 rounded-[2px] bg-loss" />tidak terpakai (sel lebih dingin)</span>
        </p>
      </ChartCard>
    </div>
  );
}
