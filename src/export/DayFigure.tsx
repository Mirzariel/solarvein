import { Fragment, useMemo, type ReactNode } from 'react';
import { DayTracks, type DayDomains } from '../charts/day/DayChart';
import { useDayModel } from '../charts/day/dayModel';
import { Subs } from '../charts/impact/Waterfall';
import { LABELS, type DayScenarioId } from '../sim/system';
import { DAY_ASSUMPTIONS, HOTEL_ASSUMPTIONS, TANK_ASSUMPTIONS } from '../sim/system';
import { useDay, useSystem } from '../state/systemSelectors';
import { EvidenceDot, formatId } from '../ui';
import { Frame, SIZE, type Ratio } from './Frame';
import { summarize } from './refs';

const ceilTo = (v: number, q: number): number => Math.max(q, Math.ceil(v / q - 1e-9) * q);

function Swatch({ kind, label }: { kind: 'direct' | 'tank' | 'backup'; label: ReactNode }) {
  const cls = kind === 'direct' ? 'fill-heat-mark' : kind === 'tank' ? 'fill-heat-mark/40 stroke-heat-mark' : 'fill-loss';
  return (
    <span className="inline-flex items-center gap-2.5">
      <svg width="22" height="14" aria-hidden="true">
        <rect x="1" y="1" width="20" height="12" className={cls} strokeWidth={kind === 'tank' ? 1.5 : 0} />
      </svg>
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

/** The site's own chart (src/charts/day), static: no playhead. Axis domains fixed to the clear day, as in the section. */
function RealDayChart({ scenario, width }: { scenario: DayScenarioId; width: number }) {
  const day = useDay(scenario);
  const clear = useDay('terik');
  const model = useDayModel(day);
  const clearModel = useDayModel(clear);
  const domains = useMemo<DayDomains>(() => ({ allocMaxKW: ceilTo(clearModel.maxDemandKW, 5), pvMaxKW: ceilTo(clearModel.maxPvKW, 2.5) }), [clearModel]);
  return <DayTracks model={model} width={width} domains={domains} />;
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
  const ev = summarize([...DAY_ASSUMPTIONS, ...TANK_ASSUMPTIONS, ...HOTEL_ASSUMPTIONS], { tags: ['simulasi'] });
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
  
  return (
    <Frame id={id} ratio={ratio} title={title} subtitle={sub} {...ev}>
      <div className={wide ? 'flex gap-10' : 'flex flex-col gap-8'}>
        <div className="flex-none" style={{ width: chartW }}>
          <RealDayChart scenario={scenario} width={chartW} />
          <ul className="m-0 mt-3 flex list-none flex-wrap gap-x-6 gap-y-2 p-0 text-ink-2" style={{ fontSize: 16 }}>
            <li>
              <Swatch kind="direct" label="Langsung dari kolektor" />
            </li>
            <li>
              <Swatch kind="tank" label="Dari tangki" />
            </li>
            <li>
              <Swatch kind="backup" label="Cadangan pemanas" />
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
