import { memo, useCallback, useRef, type PointerEvent as ReactPointerEvent } from 'react';
import { stepAt, LABELS, type DayResult } from '../../sim/system';
import { useSystemStore } from '../../state/system';
import { formatId } from '../../ui';
import { ModeHatchDefs, modeFill, useHatchId } from './ModeHatch';
import { bandPath, linePath, linear } from './scales';
import { clockLabel, type DayModel } from './dayModel';

/** Plain-SVG small multiples sharing one time axis. Tracks: mode bands · irradiance · DHW supply · tank SoC · PV. */
export const GUTTER_L = 44;
export const GUTTER_R = 10;

export type TrackId = 'bands' | 'g' | 'alloc' | 'soc' | 'pv';
export interface DayLayout {
  width: number;
  compact: boolean;
  plotL: number;
  plotR: number;
  tracks: Record<TrackId, { y0: number; h: number }>;
  axisY: number;
  height: number;
}

export function layoutTracks(width: number, multiDay: boolean): DayLayout {
  const compact = width < 520;
  const hs: Record<TrackId, number> = compact
    ? { bands: 18, g: 48, alloc: 116, soc: 44, pv: 48 }
    : { bands: 20, g: 60, alloc: 150, soc: 52, pv: 60 };
  const head = 24; // title line above each plot
  const order: TrackId[] = ['bands', 'g', 'alloc', 'soc', 'pv'];
  const tracks = {} as DayLayout['tracks'];
  let y = 0;
  for (const id of order) {
    tracks[id] = { y0: y + head, h: hs[id] };
    y += head + hs[id] + 8;
  }
  const axisY = y + 4;
  return {
    width,
    compact,
    plotL: GUTTER_L,
    plotR: Math.max(GUTTER_L + 40, width - GUTTER_R),
    tracks,
    axisY,
    height: axisY + (multiDay ? 40 : 22),
  };
}

/** Ticks at multiples of a ladder step, at most ~3 of them. */
export function ticksFor(max: number): number[] {
  const raw = max / 3;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 5, 10].map((m) => m * mag).find((s) => s >= raw - 1e-9) ?? raw;
  const out: number[] = [];
  for (let v = 0; v <= max + 1e-9; v += step) out.push(Math.round(v * 1000) / 1000);
  return out;
}

export interface DayDomains {
  /** Upper bound of the DHW supply axis [kW_th] and PV axis [kW_e]; fixed across scenarios so they compare. */
  allocMaxKW: number;
  pvMaxKW: number;
}

const TICK = { fontFamily: 'var(--font-mono)', fontSize: 12 } as const;
const HALO = { paintOrder: 'stroke', stroke: 'var(--color-paper)', strokeWidth: 4 } as const;

interface TracksProps {
  model: DayModel;
  width: number;
  domains: DayDomains;
}

/** Static part of the chart (re-renders only when the data or width changes, never on a playhead move). */
export const DayTracks = memo(function DayTracks({ model, width, domains }: TracksProps) {
  const uid = useHatchId();
  const multi = model.tMax > 24;
  const L = layoutTracks(width, multi);
  const { plotL, plotR, tracks } = L;
  const X = linear(0, model.tMax, plotL, plotR);
  const xs = model.t.map(X);

  const yG = linear(0, 1000, tracks.g.y0 + tracks.g.h, tracks.g.y0);
  const yA = linear(0, domains.allocMaxKW, tracks.alloc.y0 + tracks.alloc.h, tracks.alloc.y0);
  const yS = linear(0, 1, tracks.soc.y0 + tracks.soc.h, tracks.soc.y0);
  const yP = linear(0, domains.pvMaxKW, tracks.pv.y0 + tracks.pv.h, tracks.pv.y0);

  const base = xs.map(() => yA(0));
  const top1 = model.direct.map((v) => yA(v));
  const top2 = model.direct.map((v, i) => yA(v + (model.fromTank[i] ?? 0)));
  const top3 = model.direct.map((v, i) => yA(v + (model.fromTank[i] ?? 0) + (model.backup[i] ?? 0)));

  const xStep = multi ? 12 : L.compact ? 6 : 3;
  const xTicks: number[] = [];
  for (let t = 0; t <= model.tMax + 1e-9; t += xStep) xTicks.push(t);
  const yTop = tracks.bands.y0;
  const yBottom = tracks.pv.y0 + tracks.pv.h;

  const gap = model.bands.map((b) => X(b.t1) - X(b.t0));

  const titles: Array<[TrackId, string, string]> = [
    ['bands', 'Mode pengatur', ''],
    ['g', 'Radiasi', 'W/m²'],
    ['alloc', 'Pasokan air panas', 'kWth'],
    ['soc', 'Muatan tangki', '%'],
    ['pv', 'Listrik PV', 'kWe'],
  ];

  const rowTicks = (id: TrackId, vals: number[], yf: (v: number) => number, label: (v: number) => string) =>
    vals.map((v) => (
      <g key={`${id}-${v}`}>
        <line x1={plotL} x2={plotR} y1={yf(v)} y2={yf(v)} stroke="var(--color-line)" strokeWidth="1" />
        <text x={plotL - 6} y={yf(v)} dy="0.35em" textAnchor="end" fill="var(--color-ink-3)" {...TICK}>
          {label(v)}
        </text>
      </g>
    ));

  const tickLabel = (t: number): string => String(multi ? t % 24 : t).padStart(2, '0');

  return (
    <svg width={width} height={L.height} viewBox={`0 0 ${width} ${L.height}`} className="block max-w-none" aria-hidden="true" focusable="false">
      <ModeHatchDefs uid={uid} />

      {/* time grid */}
      {xTicks.map((t) => (
        <line
          key={`x${t}`}
          x1={X(t)}
          x2={X(t)}
          y1={yTop}
          y2={yBottom}
          stroke={multi && t % 24 === 0 && t > 0 && t < model.tMax ? 'var(--color-line-strong)' : 'var(--color-line)'}
          strokeWidth="1"
        />
      ))}

      {/* track titles */}
      {titles.map(([id, name, unit]) => (
        <text key={id} x={plotL} y={tracks[id].y0 - 8} fill="var(--color-ink-2)" {...TICK} style={HALO}>
          {name}
          {unit ? <tspan fill="var(--color-ink-3)"> · {unit}</tspan> : null}
        </text>
      ))}

      {/* 1 · mode bands */}
      <g>
        {model.bands.map((b, i) => (
          <g key={`b${i}`}>
            <rect x={X(b.t0)} y={tracks.bands.y0} width={Math.max(0, gap[i] ?? 0)} height={tracks.bands.h} fill={modeFill(uid, b.mode)} />
            {(gap[i] ?? 0) >= 18 ? (
              <text
                x={X(b.t0) + (gap[i] ?? 0) / 2}
                y={tracks.bands.y0 + tracks.bands.h / 2}
                dy="0.35em"
                textAnchor="middle"
                fill="var(--color-ink)"
                {...TICK}
                style={{ paintOrder: 'stroke', stroke: 'var(--color-paper)', strokeWidth: 3 }}
              >
                {b.mode}
              </text>
            ) : null}
            {i > 0 ? (
              <line x1={X(b.t0)} x2={X(b.t0)} y1={tracks.bands.y0} y2={tracks.bands.y0 + tracks.bands.h} stroke="var(--color-ink-3)" strokeWidth="1" />
            ) : null}
          </g>
        ))}
        <rect x={plotL} y={tracks.bands.y0} width={plotR - plotL} height={tracks.bands.h} fill="none" stroke="var(--color-ink-3)" strokeWidth="1" />
      </g>

      {/* 2 · irradiance */}
      {rowTicks('g', [0, 500, 1000], yG, (v) => formatId(v, 0))}
      <path d={linePath(xs, model.g.map(yG))} fill="none" stroke="var(--color-ink-2)" strokeWidth="1.5" strokeLinejoin="round" />

      {/* 3 · DHW supply: collector direct · tank · existing heater (stacked; Σ = demand) */}
      {rowTicks('alloc', ticksFor(domains.allocMaxKW), yA, (v) => formatId(v, 0))}
      <path d={bandPath(xs, top3, top2)} fill="var(--color-loss)" opacity="0.85" />
      <path d={bandPath(xs, top2, top1)} fill="var(--color-heat-mark)" opacity="0.42" />
      <path d={linePath(xs, top2)} fill="none" stroke="var(--color-heat-mark)" strokeWidth="1" />
      <path d={bandPath(xs, top1, base)} fill="var(--color-heat-mark)" opacity="0.95" />
      <path d={linePath(xs, top3)} fill="none" stroke="var(--color-ink-3)" strokeWidth="1" />
      {model.desiccantUsed ? (
        <path d={linePath(xs, model.desiccant.map(yA))} fill="none" stroke="var(--color-ink-2)" strokeWidth="1.5" strokeDasharray="5 4" />
      ) : (
        <g>
          <line
            x1={plotL + 8}
            x2={plotL + 26}
            y1={tracks.alloc.y0 + 9}
            y2={tracks.alloc.y0 + 9}
            stroke="var(--color-ink-2)"
            strokeWidth="1.5"
            strokeDasharray="4 3"
          />
          <text x={plotL + 32} y={tracks.alloc.y0 + 9} dy="0.35em" fill="var(--color-ink-2)" {...TICK} style={{ ...HALO, strokeWidth: 3 }}>
            {L.compact ? 'Desikan: 0' : 'Desikan: tidak dipakai'}
          </text>
        </g>
      )}

      {/* 4 · tank state of charge */}
      {rowTicks('soc', [0, 0.5, 1], yS, (v) => formatId(v * 100, 0))}
      <path d={bandPath(xs, model.soc.map(yS), xs.map(() => yS(0)))} fill="var(--color-heat-mark)" opacity="0.2" />
      <path d={linePath(xs, model.soc.map(yS))} fill="none" stroke="var(--color-heat-ink)" strokeWidth="1.5" strokeLinejoin="round" />

      {/* 5 · PV electricity (ink; never coloured) */}
      {rowTicks('pv', ticksFor(domains.pvMaxKW), yP, (v) => formatId(v, 0))}
      <path d={linePath(xs, model.pv.map(yP))} fill="none" stroke="var(--color-ink)" strokeWidth="1.5" strokeLinejoin="round" />

      {/* x axis */}
      <line x1={plotL} x2={plotR} y1={L.axisY - 2} y2={L.axisY - 2} stroke="var(--color-line-strong)" strokeWidth="1" />
      {xTicks.map((t) => (
        <text
          key={`xl${t}`}
          x={X(t)}
          y={L.axisY + 14}
          textAnchor={t === 0 ? 'start' : t >= model.tMax - 1e-9 ? 'end' : 'middle'}
          fill="var(--color-ink-2)"
          {...TICK}
        >
          {tickLabel(t)}
        </text>
      ))}
      {multi
        ? [0, 1, 2].map((d) => (
            <text key={`d${d}`} x={X(d * 24 + 12)} y={L.axisY + 33} textAnchor="middle" fill="var(--color-ink-3)" {...TICK}>
              Hari {d + 1}
            </text>
          ))
        : null}
    </svg>
  );
});

interface PlayheadProps {
  day: DayResult;
  model: DayModel;
  width: number;
  domains: DayDomains;
}

const SNAP_H = 0.25;

/** Playhead + pointer scrubbing. Reads/writes only the store hour; the static tracks never re-render. */
export function DayPlayhead({ day, model, width, domains }: PlayheadProps) {
  const hour = useSystemStore((s) => s.hour);
  const setHour = useSystemStore((s) => s.setHour);
  const multi = model.tMax > 24;
  const L = layoutTracks(width, multi);
  const { plotL, plotR, tracks } = L;
  const X = linear(0, model.tMax, plotL, plotR);
  const dragging = useRef(false);

  const yTop = tracks.bands.y0;
  const yBottom = tracks.pv.y0 + tracks.pv.h;
  const h = Math.min(model.tMax, Math.max(0, hour));
  const step = stepAt(day, h);
  const x = X(h);

  const yG = linear(0, 1000, tracks.g.y0 + tracks.g.h, tracks.g.y0)(step.climate.irradiance);
  const yS = linear(0, 1, tracks.soc.y0 + tracks.soc.h, tracks.soc.y0)(step.tank.soc);
  const yP = linear(0, domains.pvMaxKW, tracks.pv.y0 + tracks.pv.h, tracks.pv.y0)(step.collector.electricalW / 1000);

  const hourFrom = useCallback(
    (e: ReactPointerEvent<SVGRectElement>) => {
      const box = e.currentTarget.ownerSVGElement?.getBoundingClientRect();
      if (!box) return h;
      const px = e.clientX - box.left;
      const t = ((px - plotL) / (plotR - plotL)) * model.tMax;
      return Math.min(model.tMax, Math.max(0, Math.round(t / SNAP_H) * SNAP_H));
    },
    [h, plotL, plotR, model.tMax],
  );

  const label = clockLabel(h, model.tMax);
  const labelW = 42;
  const labelX = Math.min(Math.max(x - labelW / 2, plotL - 2), plotR - labelW + 2);

  return (
    <svg
      width={width}
      height={L.height}
      viewBox={`0 0 ${width} ${L.height}`}
      className="absolute left-0 top-0 block max-w-none"
      aria-hidden="true"
      focusable="false"
    >
      <rect
        x={plotL}
        y={tracks.bands.y0}
        width={plotR - plotL}
        height={yBottom - tracks.bands.y0}
        fill="transparent"
        style={{ touchAction: 'pan-y', cursor: 'ew-resize' }}
        onPointerDown={(e) => {
          dragging.current = true;
          e.currentTarget.setPointerCapture(e.pointerId);
          setHour(hourFrom(e));
        }}
        onPointerMove={(e) => {
          if (dragging.current) setHour(hourFrom(e));
        }}
        onPointerUp={(e) => {
          dragging.current = false;
          if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
        }}
        onPointerCancel={() => {
          dragging.current = false;
        }}
      />
      <g pointerEvents="none">
        <line x1={x} x2={x} y1={yTop} y2={L.axisY + 2} stroke="var(--color-ink)" strokeWidth="1" />
        <rect x={labelX} y={L.axisY + 2} width={labelW} height={20} rx="4" fill="var(--color-ink)" />
        <text x={labelX + labelW / 2} y={L.axisY + 16} textAnchor="middle" fill="var(--color-paper)" {...TICK}>
          {label}
        </text>
        {[yG, yS, yP].map((cy, i) => (
          <circle key={i} cx={x} cy={cy} r="3.5" fill="var(--color-ink)" stroke="var(--color-paper)" strokeWidth="1.5" />
        ))}
      </g>
    </svg>
  );
}

/** One-line summary for assistive tech. */
export function chartSummary(model: DayModel, scenarioLabel: string): string {
  const peakG = Math.max(0, ...model.g);
  const modes = [...new Set(model.bands.map((b) => LABELS.mode[b.mode]))].join('; ');
  return `${scenarioLabel}. Radiasi puncak ${formatId(peakG, 0)} W/m². Muatan tangki ${formatId(Math.min(...model.soc) * 100, 0)} sampai ${formatId(Math.max(...model.soc) * 100, 0)} persen. Listrik PV puncak ${formatId(model.maxPvKW, 1)} kilowatt listrik. Mode: ${modes}.`;
}
