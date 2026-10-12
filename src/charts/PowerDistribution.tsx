import { useMemo, useState } from 'react';
import { Bar, BarChart, Cell, LabelList, ReferenceLine, ResponsiveContainer, XAxis, YAxis } from 'recharts';
import type { SimResult } from '../sim';
import { fmt, fmtSigned } from './format';
import { AXIS_LINE, AXIS_TICK, COLOR, DIM_OPACITY } from './theme';

type Kind = 'electric' | 'pump' | 'liquid' | 'loss';

interface Row {
  key: string;
  name: string;
  /** Satuan / jenis daya: dipisahkan tegas antara listrik (W_e) dan termal (W_th). */
  tag: 'e' | 'th';
  value: number;
  kind: Kind;
}

function fillFor(row: Row): string {
  switch (row.kind) {
    case 'electric':
      return COLOR.ink;
    case 'pump':
      return COLOR.ink2;
    case 'liquid':
      return row.value >= 0 ? COLOR.heat : COLOR.cool;
    default:
      return COLOR.loss;
  }
}

interface TickProps {
  x?: number | string;
  y?: number | string;
  payload?: { index: number };
}

/** Sumbu Y kategori dua baris: nama + jenis daya (W_e / W_th). */
function makeTick(rows: Row[]) {
  return function CategoryTick({ x = 0, y = 0, payload }: TickProps) {
    const px = Number(x);
    const py = Number(y);
    const row = payload ? rows[payload.index] : undefined;
    if (!row) return null;
    return (
      <g transform={`translate(${px},${py})`}>
        <text x={-8} y={-2} textAnchor="end" fontSize={12} fill="var(--color-ink-2)">
          {row.name}
        </text>
        <text x={-8} y={12} textAnchor="end" fontSize={12} fontFamily="var(--font-mono)" fill="var(--color-ink-3)">
          W
          <tspan dy={3} fontSize={9}>
            {row.tag === 'e' ? 'e' : 'th'}
          </tspan>
        </text>
      </g>
    );
  };
}

interface LabelProps {
  x?: number | string;
  y?: number | string;
  width?: number | string;
  height?: number | string;
  value?: unknown;
}

/**
 * Distribusi daya: ke mana daya yang diserap panel pergi (listrik, cairan, rugi), dengan listrik (W_e)
 * dan termal (W_th) dipisahkan secara tegas. Pompa adalah konsumsi listrik, bukan bagian daya terserap.
 */
export function PowerDistribution({ result }: { result: SimResult }) {
  const rows = useMemo<Row[]>(() => {
    const r = result;
    const list: Row[] = [
      { key: 'pv', name: 'Listrik PV', tag: 'e', value: r.electricalW, kind: 'electric' },
      { key: 'pump', name: 'Konsumsi pompa', tag: 'e', value: r.pumpW, kind: 'pump' },
      { key: 'liq', name: r.qLiquidW < 0 ? 'Dari cairan' : 'Ke cairan', tag: 'th', value: r.qLiquidW, kind: 'liquid' },
      { key: 'front', name: 'Rugi depan', tag: 'th', value: r.qFrontLossW, kind: 'loss' },
      { key: 'rain', name: 'Terbawa hujan', tag: 'th', value: r.qRainW, kind: 'loss' },
      { key: 'back', name: 'Rugi belakang', tag: 'th', value: r.qBackLossW, kind: 'loss' },
      { key: 'optical', name: 'Rugi optik', tag: 'th', value: r.opticalLossW, kind: 'loss' },
    ];
    return list;
  }, [result]);

  const [hover, setHover] = useState<number | null>(null);
  const tick = useMemo(() => makeTick(rows), [rows]);
  const hasNegative = rows.some((r) => r.value < -0.05);

  const renderLabel = (p: LabelProps) => {
    const x = Number(p.x ?? 0);
    const w = Number(p.width ?? 0);
    const y = Number(p.y ?? 0);
    const h = Number(p.height ?? 0);
    const v = Number(p.value ?? 0);
    const end = x + w; // x + width = ujung bar (width negatif untuk nilai < 0)
    const anchor = v < 0 ? 'end' : 'start';
    const tx = v < 0 ? end - 6 : end + 6;
    return (
      <text x={tx} y={y + h / 2} dy="0.35em" textAnchor={anchor} fontSize={12} fontFamily="var(--font-mono)" fill="var(--color-ink)" className="num">
        {fmt(v, Math.abs(v) >= 100 ? 0 : 1)}
      </text>
    );
  };

  const desc = rows.map((r) => `${r.name} ${fmt(r.value, 1)} W ${r.tag === 'e' ? 'listrik' : 'termal'}`).join('; ');

  return (
    <div>
      <div role="img" aria-label={`Distribusi daya. ${desc}.`} className="h-[17.5rem] w-full sm:h-[19rem]">
        <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 480, height: 280 }}>
          <BarChart
            data={rows}
            layout="vertical"
            margin={{ top: 4, right: 48, bottom: 4, left: 4 }}
            barCategoryGap="22%"
            onMouseLeave={() => setHover(null)}
          >
            <XAxis
              type="number"
              tick={AXIS_TICK}
              axisLine={AXIS_LINE}
              tickLine={false}
              tickFormatter={(v: number) => fmt(v, 0)}
              tickCount={4}
              domain={[(min: number) => (min < 0 ? min * 1.3 : 0), (max: number) => max * 1.12]}
            />
            <YAxis type="category" dataKey="name" width={108} tick={tick} axisLine={false} tickLine={false} interval={0} />
            <ReferenceLine x={0} stroke="var(--color-ink-2)" strokeWidth={1} />
            <Bar
              dataKey="value"
              radius={[0, 2, 2, 0]}
              isAnimationActive={false}
              minPointSize={1}
              onMouseEnter={(_: unknown, i: number) => setHover(i)}
            >
              {rows.map((r, i) => (
                <Cell
                  key={r.key}
                  fill={fillFor(r)}
                  fillOpacity={hover === null || hover === i ? 1 : DIM_OPACITY}
                  style={{ transition: 'fill-opacity 150ms var(--ease-ui)' }}
                />
              ))}
              <LabelList dataKey="value" content={renderLabel} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <p className="mt-2 max-w-[64ch] text-small text-ink-2">
        {hasNegative ? 'Nilai negatif pada rugi berarti panas masuk dari lingkungan ke panel. ' : ''}Net listrik = listrik PV − pompa ={' '}
        <span className="num text-ink">{fmtSigned(result.netElectricalW, 1)}</span> W<sub>e</sub>.
      </p>
    </div>
  );
}
