import { Fragment, useMemo, type ReactNode } from 'react';
import { Subs } from '../charts/impact/Waterfall';
import { DESICCANT_STATUS, LABELS, modeBands, stackedAlloc, type DayScenarioId, type Sink } from '../sim/system';
import { DAY_ASSUMPTIONS, HOTEL_ASSUMPTIONS, TANK_ASSUMPTIONS } from '../sim/system';
import { useDay, useSystem } from '../state/systemSelectors';
import { EvidenceDot, formatId } from '../ui';
import { linear, niceCeil, niceTicks } from './chartKit';
import { Frame, SIZE, type Ratio } from './Frame';
import { summarize } from './refs';

const STACK: readonly Sink[] = ['dhw', 'tank', 'desiccant', 'bypass'];

const hh = (h: number) => `${String(Math.round(h) % 24).padStart(2, '0')}.00`;

/** Unit with a subscript, in SVG text. */
function SvgUnit({ base, sub }: { base: string; sub: string }) {
  return (
    <>
      {base}
      <tspan dy="4" fontSize="0.72em">
        {sub}
      </tspan>
    </>
  );
}

function Swatch({ kind, label }: { kind: Sink | 'demand'; label: ReactNode }) {
  const box = (cls: string, dashed = false) => (
    <svg width="22" height="14" aria-hidden="true">
      <rect x="1" y="1" width="20" height="12" className={cls} strokeWidth={dashed ? 1.5 : 0} strokeDasharray={dashed ? '4 3' : undefined} />
    </svg>
  );
  return (
    <span className="inline-flex items-center gap-2.5">
      {kind === 'dhw' && box('fill-heat-mark stroke-none')}
      {kind === 'tank' && box('fill-heat-mark/45 stroke-none')}
      {kind === 'desiccant' && box('fill-none stroke-ink-2', true)}
      {kind === 'bypass' && box('fill-loss stroke-none')}
      {kind === 'demand' && (
        <svg width="22" height="14" aria-hidden="true">
          <line x1="0" y1="7" x2="22" y2="7" className="stroke-ink" strokeWidth="2.5" />
        </svg>
      )}
      <span>{label}</span>
    </span>
  );
}

function Readout({ label, value, unit, digits = 1 }: { label: string; value: number; unit: ReactNode; digits?: number }) {
  return (
    <div className="border-t border-line-strong pt-3">
      <p className="m-0 flex items-center gap-2 text-ink-2" style={{ fontSize: 17, lineHeight: '22px' }}>
        {label}
        <EvidenceDot tag="simulasi" size={10} />
      </p>
      <p className="num m-0 text-ink" style={{ fontSize: 38, lineHeight: '46px', letterSpacing: '-0.02em' }}>
        {formatId(value, digits)}
        <span className="ml-2 text-ink-2" style={{ fontSize: 18 }}>
          {unit}
        </span>
      </p>
    </div>
  );
}

function DayChart({ scenario, w, h }: { scenario: DayScenarioId; w: number; h: number }) {
  const day = useDay(scenario);
  const m = { l: 74, r: 30, t: 50, b: 56 };
  const hours = day.steps.length ? day.dtH * day.steps.length : 24;
  const model = useMemo(() => {
    const alloc = stackedAlloc(day);
    const pts = alloc.map((a, i) => {
      const s = day.steps[i]!;
      return { t: a.t + day.dtH / 2, v: STACK.map((k) => a[k] / 1000), demand: s.dhw.demandW / 1000 };
    });
    const peak = Math.max(1, ...pts.map((p) => p.v.reduce((x, y) => x + y, 0)), ...pts.map((p) => p.demand));
    return { pts, yMax: niceCeil(peak * 1.04, 5), bands: modeBands(day) };
  }, [day]);

  const px = linear(0, hours, m.l, w - m.r);
  const py = linear(0, model.yMax, h - m.b, m.t);
  const cum = (p: (typeof model.pts)[number], k: number) => p.v.slice(0, k).reduce((x, y) => x + y, 0);
  const area = (k: number) => {
    const up = model.pts.map((p) => `${px(p.t).toFixed(1)},${py(cum(p, k + 1)).toFixed(1)}`);
    const down = model.pts
      .slice()
      .reverse()
      .map((p) => `${px(p.t).toFixed(1)},${py(cum(p, k)).toFixed(1)}`);
    return `M${up.join('L')}L${down.join('L')}Z`;
  };
  const demand = `M${model.pts.map((p) => `${px(p.t).toFixed(1)},${py(p.demand).toFixed(1)}`).join('L')}`;
  const yt = niceTicks(0, model.yMax, 5);
  const xStep = hours > 24 ? 6 : 3;
  const xt: number[] = [];
  for (let t = 0; t <= hours + 1e-9; t += xStep) xt.push(t);
  const modeFill: Record<string, string> = { A: 'fill-heat-wash', B: 'fill-sunken', C: 'fill-line' };

  return (
    <svg data-export-svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} role="img" aria-label={`Aliran panas kolektor per jam, ${LABELS.scenario[scenario]}`} className="block font-sans">
      {/* mode strip */}
      {model.bands.map((b, i) => (
        <g key={i}>
          <rect x={px(b.t0)} y={8} width={Math.max(px(b.t1) - px(b.t0), 0.5)} height={24} className={modeFill[b.mode]} />
          {px(b.t1) - px(b.t0) > 26 ? (
            <text x={(px(b.t0) + px(b.t1)) / 2} y={25} textAnchor="middle" className="num fill-ink" fontSize="14" fontWeight="500">
              {b.mode}
            </text>
          ) : null}
        </g>
      ))}
      {/* grid */}
      {yt.map((v) => (
        <g key={v}>
          <line x1={m.l} x2={w - m.r} y1={py(v)} y2={py(v)} className={v === 0 ? 'stroke-line-strong' : 'stroke-line'} strokeWidth="1" />
          <text x={m.l - 12} y={py(v) + 5} textAnchor="end" className="num fill-ink-2" fontSize="15">
            {formatId(v, v % 1 ? 1 : 0)}
          </text>
        </g>
      ))}
      <text x={m.l - 12} y={26} textAnchor="end" className="num fill-ink-2" fontSize="14">
        <SvgUnit base="kW" sub="th" />
      </text>
      {/* stacked heat allocation */}
      <path d={area(0)} className="fill-heat-mark" />
      <path d={area(1)} className="fill-heat-mark/45" />
      <path d={area(3)} className="fill-loss" />
      {model.pts.some((p) => p.v[2]! > 0.01) ? <path d={area(2)} className="fill-none stroke-ink-2" strokeWidth="1.5" strokeDasharray="5 4" /> : null}
      {/* hot-water demand */}
      <path d={demand} className="fill-none stroke-ink" strokeWidth="2.5" strokeLinejoin="round" />
      {/* x axis */}
      {xt.map((t) => (
        <g key={t}>
          <line x1={px(t)} x2={px(t)} y1={h - m.b} y2={h - m.b + 6} className="stroke-tick" strokeWidth="1" />
          <text x={px(t)} y={h - m.b + 26} textAnchor="middle" className="num fill-ink-2" fontSize="15">
            {hh(t)}
          </text>
        </g>
      ))}
      {hours > 24
        ? [0, 1, 2].map((d) => (
            <text key={d} x={px(d * 24 + 12)} y={h - 10} textAnchor="middle" className="num fill-ink-3" fontSize="14">
              Hari {d + 1}
            </text>
          ))
        : (
            <text x={(m.l + w - m.r) / 2} y={h - 10} textAnchor="middle" className="num fill-ink-3" fontSize="14">
              Jam setempat
            </text>
          )}
      {hours > 24
        ? [24, 48].map((t) => <line key={t} x1={px(t)} x2={px(t)} y1={m.t} y2={h - m.b} className="stroke-line-strong" strokeWidth="1" strokeDasharray="3 4" />)
        : null}
    </svg>
  );
}

export interface DayFigureProps {
  id: string;
  scenario: DayScenarioId;
  ratio: Ratio;
}

export function DayFigure({ id, scenario, ratio }: DayFigureProps) {
  const day = useDay(scenario);
  const sys = useSystem();
  const wide = ratio === '16x9';
  const { w: fw } = SIZE[ratio];
  const bodyW = fw - 128;
  const t = day.totals;
  const ev = summarize([...DAY_ASSUMPTIONS, ...TANK_ASSUMPTIONS, ...HOTEL_ASSUMPTIONS], { tags: ['simulasi', 'hipotesis'] });
  const long = scenario === 'hujan-3-hari';
  const title = long ? 'Tiga hari hujan: ke mana panas kolektor pergi' : `${LABELS.scenario[scenario]}: ke mana panas kolektor pergi`;
  const sub = (
    <>
      Hotel {formatId(sys.hotel.rooms, 0)} kamar (ilustrasi), strategi {LABELS.strategy[day.strategy].toLowerCase()}. Kebutuhan air panas tak terpenuhi:{' '}
      <span className="num">
        {formatId(t.unmetKWhTh, 1)} <Subs text="kWh_th" />
      </span>
      ; pemanas cadangan selalu siap.
    </>
  );
  const chartW = wide ? bodyW - 380 : bodyW;
  const chartH = wide ? 470 : 740;

  return (
    <Frame id={id} ratio={ratio} title={title} subtitle={sub} {...ev}>
      <div className={wide ? 'flex gap-10' : 'flex flex-col gap-8'}>
        <div className="flex-none" style={{ width: chartW }}>
          <DayChart scenario={scenario} w={chartW} h={chartH} />
          <ul className="m-0 mt-3 flex list-none flex-wrap gap-x-6 gap-y-2 p-0 text-ink-2" style={{ fontSize: 16 }}>
            {STACK.map((k) => (
              <li key={k}>
                <Swatch kind={k} label={
                    k === 'desiccant' ? (
                      <>
                        {LABELS.sink[k]} ({DESICCANT_STATUS}): <span className="num">{formatId(t.desiccantRegenKWhTh, 1)}</span> <Subs text="kWh_th" />
                      </>
                    ) : (
                      LABELS.sink[k]
                    )
                  }
                />
              </li>
            ))}
            <li>
              <Swatch kind="demand" label="Kebutuhan air panas" />
            </li>
          </ul>
          <p className="num m-0 mt-2 text-ink-3" style={{ fontSize: 14 }}>
            {(['A', 'B', 'C'] as const).map((k, i) => (
              <Fragment key={k}>
                {i ? ' · ' : ''}
                {LABELS.mode[k]}
              </Fragment>
            ))}
            . Mode dihitung dari kondisi, bukan dari jam.
          </p>
        </div>
        <div className={wide ? 'flex w-[340px] flex-none flex-col gap-4' : 'grid grid-cols-2 gap-x-8 gap-y-4'}>
          <Readout label="Fraksi surya air panas" value={t.solarFraction * 100} unit="%" digits={0} />
          <Readout label="Panas terkumpul" value={t.collectedKWhTh} unit={<Subs text="kWh_th" />} />
          <Readout label="Pemanas cadangan" value={t.dhwBackupKWhTh} unit={<Subs text="kWh_th" />} />
          <Readout label="Panas tak terpakai (bypass)" value={t.bypassKWhTh} unit={<Subs text="kWh_th" />} />
        </div>
      </div>
    </Frame>
  );
}
