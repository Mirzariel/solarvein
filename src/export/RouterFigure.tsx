import { useMemo } from 'react';
import { DESICCANT_STATUS, LABELS, MODE_TARGETS, ROUTER_ASSUMPTIONS, routerSnapshot, stepAt, type ModeTarget, type RouterSnapshot, type Sink } from '../sim/system';
import { useDay } from '../state/systemSelectors';
import { formatId, formatWithUnit } from '../ui';
import { wrap } from './chartKit';
import { Frame, SIZE, type Ratio } from './Frame';
import { summarize } from './refs';

const SINKS: readonly Sink[] = ['dhw', 'tank', 'desiccant', 'bypass'];
const hhmm = (h: number) => `${String(Math.floor(h) % 24).padStart(2, '0')}.${String(Math.round((h % 1) * 60)).padStart(2, '0')}`;

interface PanelData {
  target: ModeTarget;
  snap: RouterSnapshot;
  outletC: number;
  qKw: number;
  irradiance: number;
}

function usePanel(target: ModeTarget): PanelData {
  const { scenario, hour } = MODE_TARGETS[target];
  const day = useDay(scenario);
  return useMemo(() => {
    const step = stepAt(day, hour);
    const snap = routerSnapshot(step);
    const q = SINKS.reduce((s, k) => s + snap.allocW[k], 0) / 1000;
    return { target, snap, outletC: step.collector.outletC, qKw: q, irradiance: step.climate.irradiance };
  }, [day, hour, target]);
}

const pipeClass = (sink: Sink, live: boolean): string =>
  !live ? 'stroke-tick' : sink === 'bypass' ? 'stroke-loss' : sink === 'desiccant' ? 'stroke-ink-2' : 'stroke-heat-mark';

/** One heat branch: width = share of the collected heat; dashed = not yet validated (desiccant); grey = unused (bypass). */
function Branch({ d, sink, share, live }: { d: string; sink: Sink; share: number; live: boolean }) {
  const on = live && share > 0.004;
  return (
    <path
      d={d}
      className={`fill-none ${pipeClass(sink, on)}`}
      strokeWidth={on ? Math.max(3, share * 26) : 1.5}
      strokeDasharray={sink === 'desiccant' ? (on ? '10 6' : '3 5') : on ? undefined : '3 5'}
      strokeLinecap="butt"
    />
  );
}

function Lines({ x, y, lines, lh, className, size, anchor = 'start', weight }: { x: number; y: number; lines: string[]; lh: number; className: string; size: number; anchor?: 'start' | 'middle' | 'end'; weight?: number }) {
  return (
    <text x={x} y={y} textAnchor={anchor} className={className} fontSize={size} fontWeight={weight}>
      {lines.map((l, i) => (
        <tspan key={i} x={x} dy={i ? lh : 0}>
          {l}
        </tspan>
      ))}
    </text>
  );
}

function SinkBox({ x, y, w, h, sink, p, orient }: { x: number; y: number; w: number; h: number; sink: Sink; p: PanelData; orient: 'v' | 'h' }) {
  const { snap } = p;
  const kw = snap.allocW[sink] / 1000;
  const share = snap.pumpOn ? snap.valves[sink] : 0;
  const desiccant = sink === 'desiccant';
  const tank = sink === 'tank';
  const v = orient === 'v';
  const full = LABELS.sink[sink];
  const label = full.replace(/\s*\(.*\)/, '');
  const paren = /\((.*)\)/.exec(full)?.[1];
  const pad = 10;
  const note = tank ? `isi ${formatId(snap.tankSoc * 100, 0)}%` : snap.pumpOn && !desiccant ? `${formatId(share * 100, 0)}% panas` : '';
  const status = desiccant ? (v ? ['Hipotesis riset ·', 'belum divalidasi'] : [DESICCANT_STATUS]) : [];
  const value = (
    <>
      {formatId(kw, 1)}
      <tspan className="fill-ink-2" fontSize="13" dx="4">
        kW
      </tspan>
      <tspan className="fill-ink-2" fontSize="10" dy="4">
        th
      </tspan>
    </>
  );
  return (
    <g>
      {tank ? <rect x={x} y={y + h * (1 - snap.tankSoc)} width={w} height={h * snap.tankSoc} className="fill-heat-mark/30" /> : null}
      <rect x={x} y={y} width={w} height={h} className={desiccant ? 'fill-none stroke-ink-2' : tank ? 'fill-none stroke-line-strong' : 'fill-surface stroke-line-strong'} strokeWidth="1.5" strokeDasharray={desiccant ? '6 4' : undefined} rx="4" />
      {v ? (
        <>
          <Lines x={x + pad} y={y + 24} lines={wrap(label, 11)} lh={19} className="fill-ink" size={15} weight={500} />
          {status.length ? <Lines x={x + pad} y={y + h - 52} lines={status} lh={15} className="fill-ink-2" size={11.5} /> : null}
          {note ? (
            <text x={x + pad} y={y + h - 34} className="num fill-ink-2" fontSize="13">
              {note}
            </text>
          ) : null}
          <text x={x + pad} y={y + h - 12} className="num fill-ink" fontSize="20" fontWeight="500">
            {value}
          </text>
        </>
      ) : (
        <>
          <text x={x + pad + 4} y={y + 25} className="fill-ink" fontSize="17" fontWeight="500">
            {label}
          </text>
          <text x={x + pad + 4} y={y + h - 11} className={desiccant ? 'fill-ink-2' : 'num fill-ink-2'} fontSize="13">
            {status[0] ?? paren ?? note}
          </text>
          <text x={x + w - pad - 4} y={y + h / 2 + 8} textAnchor="end" className="num fill-ink" fontSize="24" fontWeight="500">
            {value}
          </text>
        </>
      )}
    </g>
  );
}

function PanelHead({ p, x, y, orient }: { p: PanelData; x: number; y: number; orient: 'v' | 'h' }) {
  const { scenario, hour } = MODE_TARGETS[p.target];
  void scenario;
  return (
    <>
      <text x={x} y={y} className="fill-ink" fontSize={orient === 'v' ? 24 : 28} fontWeight="500" letterSpacing="-0.4">
        {LABELS.mode[p.snap.mode]}
      </text>
      <text x={x} y={y + 26} className="num fill-ink-2" fontSize="16">
        {LABELS.modeTarget[p.target]} · {hhmm(hour)} · {formatWithUnit(p.irradiance, 'W/m²', 0)}
      </text>
    </>
  );
}

function CollectorText({ p, x, y, w }: { p: PanelData; x: number; y: number; w: number }) {
  return (
    <>
      <text x={x} y={y} className="fill-ink" fontSize="19" fontWeight="500">
        Kolektor PV/T
      </text>
      <text x={x} y={y + 26} className="num fill-ink-2" fontSize="16">
        {p.snap.pumpOn ? `keluar ${formatWithUnit(p.outletC, '°C', 0)}` : 'pompa mati'}
      </text>
      <text x={x + w} y={y + 26} textAnchor="end" className="num fill-ink" fontSize="20" fontWeight="500">
        {formatId(p.qKw, 1)}
        <tspan className="fill-ink-2" fontSize="14" dx="4">
          kW
        </tspan>
        <tspan className="fill-ink-2" fontSize="10" dy="4">
          th
        </tspan>
      </text>
    </>
  );
}

function RouterBox({ p, x, y, w, h, chars }: { p: PanelData; x: number; y: number; w: number; h: number; chars: number }) {
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} className="fill-surface stroke-ink" strokeWidth="1.5" rx="4" />
      <text x={x + 14} y={y + 28} className="fill-ink" fontSize="18" fontWeight="500">
        Router adaptif
      </text>
      <Lines x={x + 14} y={y + 54} lines={wrap(LABELS.reason[p.snap.reason], chars)} lh={22} className="fill-ink-2" size={16} />
    </g>
  );
}

export function RouterPanelV({ target, w, h }: { target: ModeTarget; w: number; h: number }) {
  const p = usePanel(target);
  const { snap } = p;
  const colW = (w - 20) / 4;
  const sy = h - 142;
  const rx = 0;
  const routerY = 226;
  const routerH = 104;
  const cx = w / 2;
  return (
    <svg data-export-svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} role="img" aria-label={`Router, ${LABELS.mode[snap.mode]}`} className="block font-sans">
      <PanelHead p={p} x={0} y={24} orient="v" />
      <rect x={0} y={78} width={w} height={74} className="fill-surface stroke-ink" strokeWidth="1.5" rx="4" />
      <CollectorText p={p} x={16} y={108} w={w - 32} />
      <line x1={cx} x2={cx} y1={152} y2={routerY} className={snap.pumpOn ? 'stroke-heat-mark' : 'stroke-tick'} strokeWidth={snap.pumpOn ? 16 : 1.5} strokeDasharray={snap.pumpOn ? undefined : '3 5'} />
      <RouterBox p={p} x={rx} y={routerY} w={w} h={routerH} chars={Math.floor((w - 28) / 9.3)} />
      {SINKS.map((s, i) => {
        const x = 10 + i * colW;
        const tx = x + colW / 2 - 5;
        const y0 = routerY + routerH;
        const d = `M${cx},${y0} C${cx},${y0 + 50} ${tx},${sy - 50} ${tx},${sy}`;
        return <Branch key={s} d={d} sink={s} share={snap.valves[s]} live={snap.pumpOn} />;
      })}
      {SINKS.map((s, i) => (
        <SinkBox key={s} x={i * colW + 5} y={sy} w={colW - 10} h={130} sink={s} p={p} orient="v" />
      ))}
    </svg>
  );
}

export function RouterPanelH({ target, w, h }: { target: ModeTarget; w: number; h: number }) {
  const p = usePanel(target);
  const { snap } = p;
  const sinkX = w - 300;
  const sinkH = 58;
  const gap = (h - 70 - sinkH * 4) / 3;
  const midY = 70 + (sinkH * 4 + gap * 3) / 2;
  const cw = 250;
  const rw = 250;
  const rx = 380;
  return (
    <svg data-export-svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} role="img" aria-label={`Router, ${LABELS.mode[snap.mode]}`} className="block font-sans">
      <PanelHead p={p} x={0} y={30} orient="h" />
      <rect x={0} y={midY - 40} width={cw} height={80} className="fill-surface stroke-ink" strokeWidth="1.5" rx="4" />
      <CollectorText p={p} x={16} y={midY - 8} w={cw - 32} />
      <line x1={cw} x2={rx} y1={midY} y2={midY} className={snap.pumpOn ? 'stroke-heat-mark' : 'stroke-tick'} strokeWidth={snap.pumpOn ? 16 : 1.5} strokeDasharray={snap.pumpOn ? undefined : '3 5'} />
      <RouterBox p={p} x={rx} y={midY - 56} w={rw} h={112} chars={Math.floor((rw - 28) / 9.3)} />
      {SINKS.map((s, i) => {
        const y = 70 + i * (sinkH + gap);
        const ty = y + sinkH / 2;
        const x0 = rx + rw;
        const d = `M${x0},${midY} C${x0 + 60},${midY} ${sinkX - 60},${ty} ${sinkX},${ty}`;
        return <Branch key={s} d={d} sink={s} share={snap.valves[s]} live={snap.pumpOn} />;
      })}
      {SINKS.map((s, i) => (
        <SinkBox key={s} x={sinkX} y={70 + i * (sinkH + gap)} w={w - sinkX} h={sinkH} sink={s} p={p} orient="h" />
      ))}
    </svg>
  );
}

const TARGETS: readonly ModeTarget[] = ['A', 'B', 'C'];

export function RouterFigure({ id, ratio }: { id: string; ratio: Ratio }) {
  const wide = ratio === '16x9';
  const bodyW = SIZE[ratio].w - 128;
  const ev = summarize(ROUTER_ASSUMPTIONS, { tags: ['simulasi', 'hipotesis'] });
  const gap = 40;
  const colW = (bodyW - gap * 2) / 3;
  return (
    <Frame
      id={id}
      ratio={ratio}
      title="Router: ke mana panas kolektor pergi, menurut kondisi"
      subtitle="Tiga kondisi dihitung dari model yang sama. Tebal pipa sebanding dengan bagian panas; garis putus-putus belum divalidasi; abu-abu tidak dipakai."
      {...ev}
    >
      {wide ? (
        <div className="flex" style={{ gap }}>
          {TARGETS.map((t) => (
            <RouterPanelV key={t} target={t} w={colW} h={620} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col" style={{ gap: 30 }}>
          {TARGETS.map((t) => (
            <RouterPanelH key={t} target={t} w={bodyW} h={372} />
          ))}
        </div>
      )}
    </Frame>
  );
}
