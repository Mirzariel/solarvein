import type { ReactNode } from 'react';
import { LABELS, type DayStep } from '../../sim/system';
import { cumulativeAt, clockLabel, dayNumber, type DayModel } from '../../charts/day/dayModel';
import { ModeSwatch } from '../../charts/day/ModeHatch';
import { TankGauge } from '../../charts/day/TankGauge';
import { BoltIcon, formatId, formatWithUnit } from '../../ui';
import { Val } from './units';

function Row({ swatch, label, children }: { swatch: ReactNode; label: string; children: ReactNode }) {
  return (
    <li className="flex items-center justify-between gap-3 py-1.5">
      <span className="inline-flex min-w-0 items-center gap-2 text-small text-ink-2">
        {swatch}
        <span className="truncate">{label}</span>
      </span>
      {children}
    </li>
  );
}

const Chip = ({ className }: { className: string }) => <span aria-hidden="true" className={`block size-2.5 shrink-0 rounded-[2px] ${className}`} />;

/** The step at the playhead: time, computed mode, one sentence (router reason), tank fill level, who supplies the hot water, PV. */
export function StepReadout({ step, model, hour }: { step: DayStep; model: DayModel; hour: number }) {
  const multi = model.tMax > 24;
  const clock = clockLabel(hour, model.tMax);
  const r = step.router;

  return (
    <div className="min-w-0 border-t border-line pt-4">
      <div className="flex items-baseline justify-between gap-3">
        <p className="num text-readout-l text-ink">
          {clock}
          {multi ? <span className="ml-2 text-mono-s text-ink-2">hari {dayNumber(hour)}</span> : null}
        </p>
        <p className="inline-flex items-center gap-2 text-label text-ink">
          <ModeSwatch mode={r.mode} />
          <span>{LABELS.mode[r.mode]}</span>
        </p>
      </div>

      <p className="mt-3 min-h-[3.75rem] max-w-[40ch] text-body text-ink">{LABELS.reason[r.reason]}</p>

      <div className="mt-4 flex items-center gap-4 border-t border-line pt-4">
        <TankGauge soc={step.tank.soc} />
        <dl className="min-w-0 text-small">
          <dt className="text-ink-2">Isi tangki</dt>
          <dd className="m-0">
            <span className="num text-readout-m text-heat-ink">{formatId(step.tank.soc * 100, 0)}</span>
            <span className="num ml-1 text-mono-s text-ink-2">%</span>
          </dd>
        </dl>
      </div>

      <ul className="m-0 mt-4 list-none border-t border-line p-0 pt-2">
        <Row swatch={<Chip className="bg-heat-mark" />} label="Langsung dari kolektor">
          <Val v={r.allocW.dhw / 1000} unit="kW" kind="th" />
        </Row>
        <Row swatch={<Chip className="border border-heat-mark bg-heat-mark/40" />} label="Dari tangki">
          <Val v={step.dhw.fromTankW / 1000} unit="kW" kind="th" />
        </Row>
        <Row swatch={<Chip className="bg-loss" />} label="Pemanas cadangan">
          <Val v={step.dhw.backupW / 1000} unit="kW" kind="th" />
        </Row>
        {r.allocW.desiccant > 1 ? (
          <Row swatch={<span aria-hidden="true" className="block h-0 w-2.5 shrink-0 border-t-[1.5px] border-dashed border-ink-2" />} label="Regenerasi desikan">
            <Val v={r.allocW.desiccant / 1000} unit="kW" kind="th" />
          </Row>
        ) : null}
      </ul>

      <div className="mt-2 flex items-baseline justify-between gap-3 border-t border-line pt-3">
        <p className="inline-flex items-center gap-2 text-label text-ink">
          <BoltIcon size={12} className="shrink-0" />
          Listrik PV
        </p>
        <Val v={step.collector.electricalW / 1000} unit="kW" kind="e" />
      </div>
    </div>
  );
}

/** Detail lines for the disclosure: collector allocation and running totals at the playhead. */
export function StepDetails({ step, model, hour }: { step: DayStep; model: DayModel; hour: number }) {
  const r = step.router;
  const cum = cumulativeAt(model, hour);
  const clock = clockLabel(hour, model.tMax);
  return (
    <div className="space-y-2 text-small text-ink-2">
      <p>
        Pukul {clock}: tangki atas <span className="num text-ink">{formatWithUnit(step.tank.topC, '°C', 1)}</span>, bawah{' '}
        <span className="num text-ink">{formatWithUnit(step.tank.bottomC, '°C', 1)}</span>.{' '}
        {r.pumpOn ? (
          <>
            Kolektor mengirim <Val v={step.collector.qLiquidW / 1000} unit="kW" kind="th" />: air panas {formatId(r.allocW.dhw / 1000, 1)}, tangki{' '}
            {formatId(r.allocW.tank / 1000, 1)}, tidak dipakai {formatId(r.allocW.bypass / 1000, 1)}.
          </>
        ) : (
          <>Pompa kolektor diam; tidak ada panas yang dikumpulkan.</>
        )}
      </p>
      <p>
        Sampai pukul {clock}: panas surya ke air panas <Val v={cum.solarKWhTh} d={0} unit="kWh" kind="th" />, pemanas cadangan{' '}
        <Val v={cum.backupKWhTh} d={0} unit="kWh" kind="th" />, listrik PV <Val v={cum.pvKWhE} d={0} unit="kWh" kind="e" />.
      </p>
    </div>
  );
}
