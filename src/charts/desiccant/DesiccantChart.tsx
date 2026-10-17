import { memo } from 'react';
import { NEAR_BREAK_EVEN_SHARE, type DesiccantEvalDetail, type RegenAirSource, type Verdict } from '../../sim/system';
import { formatId, formatWithUnit } from '../../ui';
import { linePath, linear } from '../day/scales';

/**
 * Net HVAC saving (kW_e) against regeneration temperature, ambient vs exhaust regeneration air.
 * Plain on purpose: both series dashed (the whole path is a hypothesis), verdict by marker shape (square family,
 * so it is never confused with the evidence dots), "tidak beroperasi" drawn as × on the zero line.
 * Solid / half / hollow = Layak / Marginal / Tidak layak is spelled out in the legend under the chart.
 */
const TICK = { fontFamily: 'var(--font-mono)', fontSize: 12 } as const;
const HALO = { paintOrder: 'stroke', stroke: 'var(--color-paper)', strokeWidth: 4 } as const;
const L = 48;
const R = 12;
const TOP = 14;
const BOTTOM = 34;

const SERIES: Record<RegenAirSource, { color: string; dash: string; label: string }> = {
  ambient: { color: 'var(--color-ink)', dash: '6 4', label: 'Udara luar' },
  exhaust: { color: 'var(--color-ink-2)', dash: '2 3', label: 'Udara buangan hotel' },
};

export function Marker({ verdict, operating, x, y, color, size = 9 }: { verdict: Verdict; operating: boolean; x: number; y: number; color: string; size?: number }) {
  const r = size / 2;
  if (!operating) {
    return (
      <g stroke={color} strokeWidth="1.5" strokeLinecap="round">
        <line x1={x - r} y1={y - r} x2={x + r} y2={y + r} />
        <line x1={x - r} y1={y + r} x2={x + r} y2={y - r} />
      </g>
    );
  }
  return (
    <g>
      <rect x={x - r} y={y - r} width={size} height={size} fill={verdict === 'layak' ? color : 'var(--color-paper)'} stroke={color} strokeWidth="1.5" />
      {verdict === 'marginal' ? <rect x={x - r} y={y - r} width={r} height={size} fill={color} /> : null}
    </g>
  );
}

export const verdictText = (e: DesiccantEvalDetail): string =>
  !e.operating ? 'Tidak beroperasi' : e.nearBreakEven ? '≈ impas' : e.verdict === 'layak' ? 'Layak' : e.verdict === 'marginal' ? 'Marginal' : 'Tidak layak';

export interface DesiccantChartProps {
  width: number;
  series: Record<RegenAirSource, DesiccantEvalDetail[]>;
  /** y domain [kW_e] fixed across the COP-ratio control so switching visibly moves the lines. */
  yMin: number;
  yMax: number;
  selectedC: number;
  selectedAir: RegenAirSource;
  onSelect: (regenC: number) => void;
}

export const DesiccantChart = memo(function DesiccantChart({ width, series, yMin, yMax, selectedC, selectedAir, onSelect }: DesiccantChartProps) {
  const compact = width < 520;
  const H = compact ? 260 : 340;
  const plotT = TOP;
  const plotB = H - BOTTOM;
  const temps = (series.ambient ?? []).map((e) => e.regenC);
  const tMin = temps[0] ?? 35;
  const tMax = temps[temps.length - 1] ?? 70;
  const X = linear(tMin, tMax, L + 14, width - R - 14);
  const Y = linear(yMin, yMax, plotB, plotT);
  const colW = temps.length > 1 ? (X(tMax) - X(tMin)) / (temps.length - 1) : 40;

  const coilKW = Math.max(0, ...['ambient', 'exhaust'].flatMap((a) => (series[a as RegenAirSource] ?? []).map((e) => e.hvac.coilRefWe / 1000)));
  const bandKW = NEAR_BREAK_EVEN_SHARE * coilKW;
  const ticks: number[] = [];
  for (let v = Math.ceil(yMin); v <= yMax + 1e-9; v += 1) ticks.push(v);

  // direct labels at the right end, nudged apart
  const ends = (['ambient', 'exhaust'] as const).map((air) => {
    const ops = (series[air] ?? []).filter((e) => e.operating);
    const last = ops[ops.length - 1];
    return { air, y: last ? Y(last.hvac.netSavingWe / 1000) : Y(0) };
  });
  const [a, b] = ends as [(typeof ends)[number], (typeof ends)[number]];
  const labelY: Record<RegenAirSource, number> = { ambient: a.y - 10, exhaust: b.y - 10 };
  if (Math.abs(labelY.ambient - labelY.exhaust) < 15) {
    if (labelY.ambient < labelY.exhaust) labelY.ambient = labelY.exhaust - 15;
    else labelY.exhaust = labelY.ambient - 15;
  }

  return (
    <svg width={width} height={H} viewBox={`0 0 ${width} ${H}`} className="block max-w-none" aria-hidden="true" focusable="false">
      {/* ≈ impas band: |net| below 2 % of the reference-coil electricity */}
      <rect x={L} y={Y(bandKW)} width={width - L - R} height={Math.max(1, Y(-bandKW) - Y(bandKW))} fill="var(--color-sunken)" />
      
      {/* grid */}
      {ticks.map((v) => (
        <g key={v}>
          <line x1={L} x2={width - R} y1={Y(v)} y2={Y(v)} stroke={v === 0 ? 'var(--color-ink-3)' : 'var(--color-line)'} strokeWidth="1" />
          <text x={L - 8} y={Y(v)} dy="0.35em" textAnchor="end" fill="var(--color-ink-3)" {...TICK}>
            {formatId(v, 0)}
          </text>
        </g>
      ))}
      <text x={L + 4} y={plotT + 12} fill="var(--color-ink-3)" {...TICK} fontSize={11} style={HALO}>
        hemat
      </text>
      <text x={L + 4} y={plotB - 6} fill="var(--color-ink-3)" {...TICK} fontSize={11} style={HALO}>
        boros listrik
      </text>
      <text x={L - 8} y={plotT - 4} textAnchor="end" fill="var(--color-ink-3)" {...TICK} fontSize={11}>
        kWe
      </text>

      {/* selected column */}
      <line x1={X(selectedC)} x2={X(selectedC)} y1={plotT} y2={plotB} stroke="var(--color-ink-3)" strokeWidth="1" />

      {/* x axis */}
      {temps.map((t) => (
        <text key={t} x={X(t)} y={plotB + 18} textAnchor="middle" fill={t === selectedC ? 'var(--color-ink)' : 'var(--color-ink-2)'} {...TICK} fontWeight={t === selectedC ? 600 : 400}>
          {t}
        </text>
      ))}
      <text x={width - R} y={H - 2} textAnchor="end" fill="var(--color-ink-3)" {...TICK} fontSize={11}>
        suhu regenerasi, °C
      </text>

      {/* series */}
      {(['exhaust', 'ambient'] as const).map((air) => {
        const ev = series[air] ?? [];
        const s = SERIES[air];
        const dim = air === selectedAir ? 1 : 0.62;
        const ys = ev.map((e) => (e.operating ? Y(e.hvac.netSavingWe / 1000) : null));
        return (
          <g key={air} opacity={dim}>
            <path d={linePath(ev.map((e) => X(e.regenC)), ys)} fill="none" stroke={s.color} strokeWidth="1.5" strokeDasharray={s.dash} strokeLinecap="round" />
            {ev.map((e) => (
              <Marker key={e.regenC} verdict={e.verdict} operating={e.operating} x={X(e.regenC)} y={e.operating ? Y(e.hvac.netSavingWe / 1000) : Y(0)} color={s.color} />
            ))}
            {ev.some((e) => e.operating) ? (
              <text x={width - R - 2} y={labelY[air]} textAnchor="end" fill={s.color} {...TICK} style={HALO}>
                {s.label}
              </text>
            ) : null}
          </g>
        );
      })}

      {/* click targets: a full-height column per temperature */}
      {temps.map((t) => (
        <rect
          key={t}
          x={X(t) - colW / 2}
          y={plotT}
          width={colW}
          height={plotB - plotT + 24}
          fill="transparent"
          style={{ cursor: 'pointer' }}
          onClick={() => onSelect(t)}
        />
      ))}
    </svg>
  );
});

export function VerdictKey() {
  const k = (v: Verdict | 'none') => (
    <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true" className="shrink-0">
      <Marker verdict={v === 'none' ? 'tidak-layak' : v} operating={v !== 'none'} x={7} y={7} color="var(--color-ink)" size={9} />
    </svg>
  );
  return (
    <ul className="m-0 flex list-none flex-wrap items-center gap-x-5 gap-y-1.5 p-0 text-small text-ink-2">
      <li className="inline-flex items-center gap-2">{k('layak')}Layak</li>
      <li className="inline-flex items-center gap-2">{k('marginal')}Marginal</li>
      <li className="inline-flex items-center gap-2">{k('tidak-layak')}Tidak layak</li>
      <li className="inline-flex items-center gap-2">{k('none')}Tidak beroperasi</li>
      <li className="inline-flex items-center gap-2">
        <span aria-hidden="true" className="block h-2.5 w-4 bg-sunken outline outline-1 outline-line" />
        ≈ impas (di bawah {formatWithUnit(NEAR_BREAK_EVEN_SHARE * 100, '%', 0)} koil acuan)
      </li>
    </ul>
  );
}
