import { useMemo } from 'react';
import { Subs, Waterfall } from '../charts/impact/Waterfall';
import { LABELS, type BaselineId, type EvidenceTag, type RefId } from '../sim/system';
import { useBaselines, useSystem } from '../state/systemSelectors';
import { EvidenceDot, formatId, formatSigned } from '../ui';
import { Frame, SIZE, type Ratio } from './Frame';
import { summarize } from './refs';

const IDS: readonly BaselineId[] = ['B1', 'B2', 'B3', 'B4'];

/** Net CO2e per baseline as horizontal bars (zero line, signed), with the simple payback beside each name. */
function BaselineBars({ w, rowH }: { w: number; rowH: number }) {
  const data = useBaselines();
  const nets = IDS.map((id) => data.ledgers[id].netKgPerYear / 1000);
  const hi = Math.max(1, ...nets);
  const lo = Math.min(0, ...nets);
  const valW = 150;
  const trackW = w - valW;
  const px = (v: number) => ((v - lo) / (hi - lo || 1)) * trackW;
  const x0 = px(0);
  const H = IDS.length * rowH + 34;
  return (
    <svg data-export-svg width={w} height={H} viewBox={`0 0 ${w} ${H}`} role="img" aria-label="Emisi CO₂e bersih per tahun, per pembanding" className="block font-sans">
      <text x={0} y={18} className="num fill-ink-3" fontSize="14">
        t CO₂e per tahun, bersih · payback sederhana (tengah)
      </text>
      {IDS.map((id, i) => {
        const y = 34 + i * rowH;
        const v = nets[i] as number;
        const pay = data.economics[id].paybackYears[1];
        const payTxt = Number.isFinite(pay) ? `payback ${formatId(pay, 1)} tahun` : 'tidak ada payback';
        const bx = Math.min(px(v), x0);
        const bw = Math.max(Math.abs(px(v) - x0), 1.5);
        return (
          <g key={id}>
            <line x1={0} x2={w} y1={y} y2={y} className="stroke-line" strokeWidth="1" />
            <text x={0} y={y + 30} className="num fill-ink" fontSize="22" fontWeight="500">
              {id}
            </text>
            <text x={50} y={y + 30} className="fill-ink-2" fontSize="19">
              {LABELS.baseline[id]}
            </text>
            <text x={w} y={y + 30} textAnchor="end" className="num fill-ink-2" fontSize="16">
              {payTxt}
            </text>
            <rect x={bx} y={y + 44} width={bw} height={rowH - 62} className={id === 'B2' ? 'fill-ink' : 'fill-ink-3'} />
            <text x={w} y={y + rowH - 20} textAnchor="end" className="num fill-ink" fontSize="26" fontWeight="500">
              {formatSigned(v, 1)}
            </text>
          </g>
        );
      })}
      <line x1={x0} x2={x0} y1={30} y2={H} className="stroke-line-strong" strokeWidth="1.5" />
    </svg>
  );
}

/** First sentences of the generated verdict (it is long; the rest lives on the site). */
function lead(verdict: string, n: number): string {
  return verdict.split(/(?<=\.)\s+(?=[A-Z])/).slice(0, n).join(' ');
}

/** 16:9: the B2 ledger in five lines (the full waterfall is on the 4:5 figure and on the site). */
function B2Summary() {
  const data = useBaselines();
  const l = data.ledgers.B2;
  const rows: { label: string; v: number; tag: EvidenceTag; strong?: boolean }[] = [
    { label: 'Dihindari, kotor', v: l.grossAvoidedKgPerYear, tag: 'simulasi' },
    { label: 'Emisi tertanam, dibagi umur pakai', v: -l.embodiedKgPerYear, tag: 'asumsi' },
    { label: 'Listrik parasit (pompa, pengendali)', v: -l.parasiticKgPerYear, tag: 'simulasi' },
    { label: 'Bersih', v: l.netKgPerYear, tag: 'simulasi', strong: true },
  ];
  return (
    <div>
      {rows.map((r) => (
        <div key={r.label} className={`flex items-baseline justify-between gap-4 border-t py-4 ${r.strong ? 'border-ink' : 'border-line'}`}>
          <p className="m-0 flex items-center gap-2.5 text-ink" style={{ fontSize: 21, fontWeight: r.strong ? 500 : 400 }}>
            {r.label}
            <EvidenceDot tag={r.tag} size={11} className="text-ink-2" />
          </p>
          <p className="num m-0 text-ink" style={{ fontSize: 28, fontWeight: r.strong ? 500 : 400 }}>
            {formatSigned(r.v, 0)}
            <span className="ml-2 text-ink-2" style={{ fontSize: 15 }}>
              kg
            </span>
          </p>
        </div>
      ))}
      <p className="num m-0 border-t border-line pt-4 text-ink-2" style={{ fontSize: 16 }}>
        Payback karbon: {Number.isFinite(l.carbonPaybackYears) ? `${formatId(l.carbonPaybackYears, 1)} tahun` : 'tidak ada'}
      </p>
    </div>
  );
}

export function KpiFigure({ id, ratio }: { id: string; ratio: Ratio }) {
  const data = useBaselines();
  const sys = useSystem();
  const wide = ratio === '16x9';
  const ledger = data.ledgers.B2;
  const ev = useMemo(() => {
    const rows = IDS.flatMap((b) => data.ledgers[b].rows);
    const refs = rows.flatMap((r) => [r.refId, r.factor?.refId].filter(Boolean) as RefId[]);
    const tags = rows.map((r) => r.tag as EvidenceTag);
    return summarize(rows, { tags: ['simulasi', ...tags], refIds: refs });
  }, [data]);
  const bodyW = SIZE[ratio].w - 128;
  const barsW = wide ? bodyW : bodyW;

  return (
    <Frame
      id={id}
      ratio={ratio}
      title="CO₂e bersih per tahun, dibanding empat pembanding"
      subtitle={<Subs text={lead(data.verdict, 2)} />}
      {...ev}
    >
      <div className={wide ? 'grid h-full gap-x-12' : 'flex flex-col gap-8'} style={wide ? { gridTemplateColumns: '1fr 1fr' } : undefined}>
        <div>
          <BaselineBars w={wide ? bodyW / 2 - 24 : barsW} rowH={wide ? 98 : 92} />
          <p className="m-0 mt-3 text-ink-2" style={{ fontSize: 16, lineHeight: '23px', maxWidth: 680 }}>
            Sudah dikurangi emisi tertanam dan listrik pompa. B2 (PV + pompa kalor air panas) adalah pembanding terkuat; B1 adalah hotel konvensional.
            Umur pakai <span>{formatId(sys.carbon.lifetimeYears, 0)}</span> tahun.
          </p>
        </div>
        <div>
          <p className="m-0 mb-3 flex items-center gap-2 text-ink" style={{ fontSize: 20, fontWeight: 500 }}>
            Rincian terhadap B2, kgCO₂e per tahun
            <EvidenceDot tag="simulasi" size={11} />
          </p>
          {wide ? (
            <B2Summary />
          ) : (
            <div className="export-waterfall">
              <Waterfall ledger={ledger} baselineName={`B2 (${LABELS.baseline.B2})`} lifetimeYears={sys.carbon.lifetimeYears} />
            </div>
          )}
        </div>
      </div>
    </Frame>
  );
}
