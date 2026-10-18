import { useMemo, useRef, type PointerEvent, type ReactNode } from 'react';
import { formatId } from '../../ui';
import { COLOR } from '../theme';

/**
 * Panel deret waktu SVG polos untuk Lab (suhu dan satu hari). Satu sumbu waktu bersama, garis 1 px, label langsung di
 * tepi kanan (nilai pada jam yang dipilih), kursor jam yang bisa digeser. Nilai null memutus garis (mis. pompa mati:
 * tidak ada suhu keluar).
 */
const MONO = "var(--font-mono, 'Geist Mono Variable', ui-monospace, monospace)";
const HALO = { paintOrder: 'stroke', stroke: 'var(--color-paper)', strokeWidth: 3, strokeLinejoin: 'round' } as const;

export interface TSeries {
  id: string;
  label: string;
  color: string;
  values: (number | null)[];
  width?: number;
  /** dashed = belum divalidasi (hanya jalur desikan) */
  dashed?: boolean;
  /** isi area ke garis dasar (atau tumpukan) */
  area?: boolean;
  fillOpacity?: number;
  /** tanpa label langsung */
  noLabel?: boolean;
}

export interface TPanelProps {
  title: string;
  unit: ReactNode;
  ts: number[];
  t0: number;
  t1: number;
  series: TSeries[];
  /** area bertumpuk: nilai seri ditambahkan berurutan (hanya satuan yang sama) */
  stacked?: boolean;
  yMin?: number;
  yMax?: number;
  digits?: number;
  /** garis acuan datar (mis. suhu set) */
  refLines?: { y: number; label: string }[];
  width: number;
  height?: number;
  cursor: number;
  onScrub?: (hour: number) => void;
  showXAxis?: boolean;
  /** pita mode di atas panel (modeBands) */
  bands?: { mode: 'A' | 'B' | 'C'; t0: number; t1: number }[];
  /** gunakan tanpa label tepi kanan */
  gutter?: number;
  desc?: string;
}

const PAD_T = 6;
const PAD_L = 2;

function niceMax(v: number): number {
  if (!(v > 0)) return 1;
  const p = Math.pow(10, Math.floor(Math.log10(v)));
  const m = v / p;
  const n = m <= 1 ? 1 : m <= 2 ? 2 : m <= 2.5 ? 2.5 : m <= 5 ? 5 : 10;
  return n * p;
}

function niceTicks(lo: number, hi: number, n = 3): number[] {
  const span = hi - lo;
  const raw = span / n;
  const p = Math.pow(10, Math.floor(Math.log10(raw)));
  const m = raw / p;
  const step = (m <= 1 ? 1 : m <= 2 ? 2 : m <= 5 ? 5 : 10) * p;
  const out: number[] = [];
  for (let v = Math.ceil(lo / step) * step; v <= hi + 1e-9; v += step) out.push(Number(v.toFixed(6)));
  return out;
}

/** Interpolasi nilai seri pada jam h (null bila salah satu tetangga null). */
function valueAt(ts: number[], vs: (number | null)[], h: number): number | null {
  if (ts.length === 0) return null;
  if (h <= (ts[0] as number)) return vs[0] ?? null;
  for (let i = 1; i < ts.length; i++) {
    const b = ts[i] as number;
    if (h <= b) {
      const a = ts[i - 1] as number;
      const va = vs[i - 1] ?? null;
      const vb = vs[i] ?? null;
      if (va === null || vb === null) return (h - a < b - h ? va : vb) ?? null;
      const f = b > a ? (h - a) / (b - a) : 0;
      return va + (vb - va) * f;
    }
  }
  return vs[vs.length - 1] ?? null;
}

const BAND_FILL: Record<'A' | 'B' | 'C', string> = { A: COLOR.ink, B: COLOR.ink3, C: COLOR.axis };

export function TimePanel({
  title,
  unit,
  ts,
  t0,
  t1,
  series,
  stacked,
  yMin,
  yMax,
  digits = 0,
  refLines,
  width,
  height = 92,
  cursor,
  onScrub,
  showXAxis,
  bands,
  gutter = 118,
  desc,
}: TPanelProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const dragging = useRef(false);
  const padR = gutter;
  const padB = showXAxis ? 20 : 4;
  const bandH = bands ? 16 : 0;
  const plotTop = PAD_T + bandH + (bands ? 6 : 0);
  const plotH = height - plotTop - padB;
  const plotW = Math.max(40, width - PAD_L - padR);

  const stackedVals = useMemo(() => {
    if (!stacked) return null;
    const cum: number[][] = [];
    series.forEach((s, si) => {
      cum.push(ts.map((_, i) => (cum[si - 1]?.[i] ?? 0) + Math.max(0, s.values[i] ?? 0)));
    });
    return cum;
  }, [stacked, series, ts]);

  const [lo, hi] = useMemo(() => {
    let mx = -Infinity;
    let mn = Infinity;
    if (stackedVals) {
      for (const row of stackedVals) for (const v of row) mx = Math.max(mx, v);
      mn = 0;
    } else {
      for (const s of series) for (const v of s.values) if (v !== null && Number.isFinite(v)) (mx = Math.max(mx, v), (mn = Math.min(mn, v)));
      for (const r of refLines ?? []) (mx = Math.max(mx, r.y), (mn = Math.min(mn, r.y)));
    }
    if (!Number.isFinite(mx)) (mx = 1, (mn = 0));
    const area = series.some((s) => s.area);
    const low = yMin ?? (area || stacked ? 0 : mn - (mx - mn) * 0.08);
    const high = yMax ?? (stacked || area ? niceMax(mx * 1.05) : mx + (mx - mn) * 0.08 + 1e-6);
    return [low, high > low ? high : low + 1];
  }, [series, stackedVals, yMin, yMax, refLines]);

  const X = (t: number) => PAD_L + ((t - t0) / (t1 - t0)) * plotW;
  const Y = (v: number) => plotTop + plotH - ((v - lo) / (hi - lo)) * plotH;

  const linePath = (vs: (number | null)[]): string => {
    let d = '';
    let pen = false;
    vs.forEach((v, i) => {
      if (v === null || !Number.isFinite(v)) {
        pen = false;
        return;
      }
      d += `${pen ? 'L' : 'M'}${X(ts[i] as number).toFixed(1)} ${Y(v).toFixed(1)}`;
      pen = true;
    });
    return d;
  };

  const areaPath = (top: (number | null)[], base: (number | null)[] | null, own?: (number | null)[]): string => {
    const live = (k: number) => top[k] !== null && (!own || (own[k] ?? 0) > 1e-6);
    // segmen menerus tanpa null
    let d = '';
    let i = 0;
    while (i < top.length) {
      if (!live(i)) {
        i++;
        continue;
      }
      let j = i;
      while (j + 1 < top.length && live(j + 1)) j++;
      const seg = [];
      for (let k = i; k <= j; k++) seg.push(`${X(ts[k] as number).toFixed(1)} ${Y(top[k] as number).toFixed(1)}`);
      const back = [];
      for (let k = j; k >= i; k--) back.push(`${X(ts[k] as number).toFixed(1)} ${Y(base ? (base[k] ?? 0) : lo > 0 ? lo : 0).toFixed(1)}`);
      d += `M${seg.join('L')}L${back.join('L')}Z`;
      i = j + 1;
    }
    return d;
  };

  const yTicks = niceTicks(lo, hi, 3);
  const span = t1 - t0;
  const xStep = span > 30 ? 12 : 3;
  const xTicks: number[] = [];
  for (let t = t0; t <= t1 + 1e-9; t += xStep) xTicks.push(t);

  const fromEvent = (e: PointerEvent<SVGSVGElement>): number => {
    const r = svgRef.current?.getBoundingClientRect();
    if (!r) return cursor;
    const px = ((e.clientX - r.left) / r.width) * width;
    return Math.min(t1, Math.max(t0, t0 + ((px - PAD_L) / plotW) * (t1 - t0)));
  };

  // etiket langsung: nilai pada kursor, diurai agar tidak bertumpuk
  const labels = useMemo(() => {
    const items = series
      .filter((s) => !s.noLabel)
      .map((s, idx) => {
        const si = series.indexOf(s);
        let v: number | null;
        let yv: number | null;
        if (stackedVals) {
          v = valueAt(ts, s.values, cursor);
          const topA = valueAt(ts, stackedVals[si] as number[], cursor);
          const botA = si > 0 ? valueAt(ts, stackedVals[si - 1] as number[], cursor) : 0;
          yv = topA === null || botA === null ? null : (topA + botA) / 2;
        } else {
          v = valueAt(ts, s.values, cursor);
          yv = v;
        }
        return { s, idx, v, y: yv === null ? null : Y(yv) };
      })
      .filter((l) => l.y !== null) as { s: TSeries; idx: number; v: number | null; y: number }[];
    items.sort((a, b) => a.y - b.y);
    const minGap = 13;
    for (let i = 1; i < items.length; i++) {
      const prev = items[i - 1] as (typeof items)[number];
      const cur = items[i] as (typeof items)[number];
      if (cur.y - prev.y < minGap) cur.y = prev.y + minGap;
    }
    return items;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [series, stackedVals, ts, cursor, lo, hi, plotH, plotTop]);

  const cx = X(Math.min(t1, Math.max(t0, cursor)));

  return (
    <div className="min-w-0">
      <p className="m-0 flex items-baseline gap-2 text-label text-ink-2">
        <span className="text-ink">{title}</span>
        <span className="num text-mono-label text-ink-3">{unit}</span>
      </p>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${width} ${height}`}
        width="100%"
        height={height}
        role="img"
        aria-label={desc ?? title}
        className="mt-1 block select-none overflow-visible"
        style={{ touchAction: 'pan-y', cursor: onScrub ? 'ew-resize' : undefined }}
        onPointerDown={(e) => {
          if (!onScrub) return;
          dragging.current = true;
          e.currentTarget.setPointerCapture(e.pointerId);
          onScrub(fromEvent(e));
        }}
        onPointerMove={(e) => {
          if (dragging.current && onScrub) onScrub(fromEvent(e));
        }}
        onPointerUp={() => {
          dragging.current = false;
        }}
        onPointerCancel={() => {
          dragging.current = false;
        }}
      >
        {bands ? (
          <g>
            {bands.map((b, i) => {
              const x0 = X(Math.max(t0, b.t0));
              const x1 = X(Math.min(t1, b.t1));
              return (
                <g key={i}>
                  <rect x={x0} y={PAD_T} width={Math.max(0, x1 - x0)} height={bandH} fill={BAND_FILL[b.mode]} />
                  {x1 - x0 > 14 ? (
                    <text x={(x0 + x1) / 2} y={PAD_T + bandH / 2 + 4} textAnchor="middle" fontFamily={MONO} fontSize={11} fill={b.mode === 'C' ? COLOR.ink : COLOR.surface}>
                      {b.mode}
                    </text>
                  ) : null}
                </g>
              );
            })}
          </g>
        ) : null}

        {/* grid y */}
        {(series.length > 0 ? yTicks : []).map((v) => (
          <g key={v}>
            <line x1={PAD_L} x2={PAD_L + plotW} y1={Y(v)} y2={Y(v)} stroke={COLOR.grid} strokeWidth={1} />
          </g>
        ))}
        {(series.length > 0 ? yTicks : []).map((v) => (
          <text key={`l${v}`} x={PAD_L} y={Y(v) - 3} fontFamily={MONO} fontSize={11} fill="var(--color-ink-3)" style={HALO}>
            {formatId(v, digits)}
          </text>
        ))}
        {refLines?.map((r) => (
          <g key={r.label}>
            <line x1={PAD_L} x2={PAD_L + plotW} y1={Y(r.y)} y2={Y(r.y)} stroke={COLOR.axis} strokeWidth={1} />
            <text x={PAD_L + plotW - 2} y={Y(r.y) - 4} textAnchor="end" fontFamily={MONO} fontSize={11} fill="var(--color-ink-2)" style={HALO}>
              {r.label}
            </text>
          </g>
        ))}

        {/* area dan garis */}
        {stackedVals
          ? series.map((s, si) => (
              <path
                key={s.id}
                d={areaPath(stackedVals[si] as number[], si > 0 ? (stackedVals[si - 1] as number[]) : null, s.values)}
                fill={s.dashed ? 'none' : s.color}
                fillOpacity={s.fillOpacity ?? 0.8}
                stroke={s.dashed ? s.color : 'none'}
                strokeDasharray={s.dashed ? '3 2' : undefined}
                strokeWidth={1}
              />
            ))
          : series.map((s) => (
              <g key={s.id}>
                {s.area ? <path d={areaPath(s.values, null)} fill={s.color} fillOpacity={s.fillOpacity ?? 0.22} /> : null}
                <path d={linePath(s.values)} fill="none" stroke={s.color} strokeWidth={s.width ?? 1.5} strokeDasharray={s.dashed ? '4 3' : undefined} strokeLinejoin="round" />
              </g>
            ))}

        {/* x axis */}
        {showXAxis
          ? xTicks.map((t) => (
              <g key={t}>
                <line x1={X(t)} x2={X(t)} y1={plotTop + plotH} y2={plotTop + plotH + 4} stroke={COLOR.axis} />
                <text x={X(t)} y={plotTop + plotH + 16} textAnchor="middle" fontFamily={MONO} fontSize={11} fill="var(--color-ink-2)">
                  {String(((t % 24) + 24) % 24).padStart(2, '0')}
                  {span > 30 && t % 24 === 0 && t > 0 ? '' : ''}
                </text>
              </g>
            ))
          : null}
        <line x1={PAD_L} x2={PAD_L + plotW} y1={plotTop + plotH} y2={plotTop + plotH} stroke={COLOR.axis} strokeWidth={1} />

        {/* kursor */}
        <line x1={cx} x2={cx} y1={plotTop - 2} y2={plotTop + plotH} stroke={COLOR.ink} strokeWidth={1} />
        {labels.map((l) => (
          <g key={l.s.id}>
            <circle cx={cx} cy={Y(l.v ?? lo)} r={2.5} fill={l.s.color} stroke="var(--color-paper)" strokeWidth={1} />
            <text x={PAD_L + plotW + 8} y={l.y + 4} fontFamily={MONO} fontSize={11.5} fill="var(--color-ink-2)" style={HALO}>
              {l.s.label}{' '}
              <tspan fill="var(--color-ink)" fontWeight={500}>
                {l.v === null ? '—' : formatId(l.v, digits)}
              </tspan>
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}
