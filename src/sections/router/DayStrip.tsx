/**
 * DayStrip: the sun-arc / clock strip under the diagram. Irradiance curve of the scenario's day, the computed
 * A/B/C mode bands (A solid amber, B hatched, C graphite tint) and a playhead that follows the engine's clock.
 *
 * Scrubbing: in the pinned scene the scroll position drives the hour; the (invisible) range input on top lets a
 * pointer or the keyboard jump instead (`onHour`). The playhead, clock text and input value are written straight
 * from the engine frame (`useFrameListener`), so the strip never re-renders while the hour moves.
 */
import { useId, useMemo, useRef } from 'react';
import { useFrameListener } from '../../motion';
import { LABELS, modeBands, type DayResult, type DayScenarioId, type ModeBand } from '../../sim/system';
import { useSystemStore } from '../../state/system';
import { useSystemView } from '../../state/systemSelectors';
import { PALETTES } from './palette';

export const DAY_T0 = 5;
export const DAY_T1 = 24;
const FULL_W = 1280;
const H_FULL = 86;
const H_DENSE = 66;
const xAt = (W: number, h: number): number => ((Math.min(DAY_T1, Math.max(DAY_T0, h)) - DAY_T0) / (DAY_T1 - DAY_T0)) * W;

export const clock = (h: number): string => {
  const hh = Math.floor(((h % 24) + 24) % 24);
  const mm = Math.floor((h - Math.floor(h)) * 60);
  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
};

export function bandsOf(day: DayResult): ModeBand[] {
  return modeBands(day).filter((b) => b.t1 > DAY_T0 && b.t0 < DAY_T1);
}

export default function DayStrip({ scenario, onHour, className, compact, dense }: { scenario: DayScenarioId; onHour: (h: number) => void; className?: string; compact?: boolean; dense?: boolean }) {
  const H = dense ? H_DENSE : H_FULL;
  const sysView = useSystemView();
  const strategy = useSystemStore((s) => s.strategy);
  const W = compact ? 360 : FULL_W;
  const x = (h: number) => xAt(W, h);
  const P = PALETTES.page;
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const day = useMemo(() => sysView.day(scenario, strategy), [sysView, scenario, strategy]);
  const head = useRef<SVGGElement>(null);
  const label = useRef<SVGTextElement>(null);
  const input = useRef<HTMLInputElement>(null);

  const { curve, area, bands, peak } = useMemo(() => {
    const steps = day.steps.filter((s) => s.t >= DAY_T0 - 0.25 && s.t <= DAY_T1 + 0.25);
    const gMax = Math.max(1, ...day.steps.map((s) => s.climate.irradiance));
    const base = dense ? 28 : 46;
    const y = (g: number) => base - (g / gMax) * (dense ? 16 : 22);
    const pts = steps.map((s) => `${x(s.t).toFixed(1)},${y(s.climate.irradiance).toFixed(1)}`);
    const line = `M${pts.join(' L')}`;
    return { curve: line, area: `${line} L${x(DAY_T1)},${dense ? 28 : 46} L${x(DAY_T0)},${dense ? 28 : 46} Z`, bands: bandsOf(day), peak: Math.round(gMax) };
      // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [day, W, dense]);

  useFrameListener((f) => {
    const h = f.hour ?? DAY_T0;
    const px = x(h);
    head.current?.setAttribute('transform', `translate(${px.toFixed(1)} 0)`);
    const t = label.current;
    if (t) {
      const txt = clock(h);
      if (t.textContent !== txt) t.textContent = txt;
      t.setAttribute('text-anchor', px > W - 40 ? 'end' : px < 30 ? 'start' : 'middle');
    }
    const inp = input.current;
    if (inp && document.activeElement !== inp) {
      inp.value = String(Math.min(DAY_T1, Math.max(DAY_T0, h)));
      inp.setAttribute('aria-valuetext', `pukul ${clock(h)}`);
    }
  }, 0);

  const ticks = compact ? [6, 12, 18, 24] : [6, 9, 12, 15, 18, 21, 24];
  return (
    <div className={className} style={{ position: 'relative', lineHeight: 0 }} data-day-strip>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" aria-hidden="true" style={{ display: 'block', overflow: 'visible' }}>
        <defs>
          <pattern id={`${uid}hatch`} width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <rect width="6" height="6" fill={P.paper} />
            <path d="M0,0 V6" stroke={P.ink2} strokeWidth="1.2" />
          </pattern>
        </defs>
        <path d={area} fill={P.lineStrong} opacity={0.45} />
        <path d={curve} fill="none" stroke={P.ink} strokeWidth={1} />
        {compact ? null : (
          <text x={2} y={dense ? 24 : 38} fontFamily={P.mono} fontSize={13} fill={P.ink3}>
            G puncak {peak} W/m²
          </text>
        )}
        {bands.map((b) => {
          const x0 = x(Math.max(b.t0, DAY_T0));
          const x1 = x(Math.min(b.t1, DAY_T1));
          const fill = b.mode === 'A' ? P.heat : b.mode === 'B' ? `url(#${uid}hatch)` : P.ink3;
          return (
            <g key={`${b.mode}${b.t0}`}>
              <rect x={x0} y={dense ? 32 : 50} width={Math.max(0, x1 - x0)} height={14} fill={fill} opacity={b.mode === 'C' ? 0.35 : 1} />
              {x1 - x0 > 22 ? (
                <text x={(x0 + x1) / 2} y={dense ? 43 : 61} textAnchor="middle" fontFamily={P.mono} fontSize={13} fontWeight={500} fill={b.mode === 'C' ? P.ink : P.ink}>
                  {b.mode}
                </text>
              ) : null}
            </g>
          );
        })}
        {ticks.map((t) => (
          <g key={t}>
            <path d={`M${x(t)},${dense ? 46 : 64} v4`} stroke={P.tick} strokeWidth={1} />
            <text x={x(t)} y={dense ? 63 : 82} textAnchor={t === DAY_T1 ? 'end' : 'middle'} fontFamily={P.mono} fontSize={13} fill={P.ink3}>
              {String(t % 24).padStart(2, '0')}
            </text>
          </g>
        ))}
        <g ref={head} transform={`translate(${x(DAY_T0)} 0)`}>
          <path d={`M0,${dense ? 14 : 18} V${dense ? 48 : 66}`} stroke={P.ink} strokeWidth={1.5} />
          <text ref={label} x={0} y={dense ? 10 : 12} fontFamily={P.mono} fontSize={14} fontWeight={500} fill={P.ink} style={{ paintOrder: 'stroke', stroke: P.paper, strokeWidth: 3.5 }}>
            {clock(DAY_T0)}
          </text>
        </g>
      </svg>
      <input
        ref={input}
        type="range"
        min={DAY_T0}
        max={DAY_T1}
        step={0.25}
        defaultValue={DAY_T0}
        aria-label={`Jam dalam sehari, ${LABELS.scenario[scenario]}`}
        onInput={(e) => onHour(Number((e.target as HTMLInputElement).value))}
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', margin: 0, opacity: 0, cursor: 'ew-resize' }}
      />
    </div>
  );
}
