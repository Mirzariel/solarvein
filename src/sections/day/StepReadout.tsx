import type { ReactNode } from 'react';
import { LABELS, type DayStep } from '../../sim/system';
import { cumulativeAt, clockLabel, dayNumber, type DayModel } from '../../charts/day/dayModel';
import { ModeSwatch } from '../../charts/day/ModeHatch';
import { TankGauge } from '../../charts/day/TankGauge';
import { BoltIcon } from '../../ui';
import { formatId } from '../../ui';
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

/** The step at the playhead: one sentence (router reason), tank fill level, who supplies the hot water, PV. */
export function StepReadout({ step, model }: { step: DayStep; model: DayModel }) {
  const multi = model.tMax > 24;
  const clock = clockLabel(step.t, model.tMax);
  const r = step.router;
  const cum = cumulativeAt(model, step.t);
  const collectorKW = step.collector.qLiquidW / 1000;

  return (
    <div className="min-w-0 border-t border-line pt-4">
      <div className="flex items-baseline justify-between gap-3">
        <p className="num text-readout-l text-ink">
          {clock}
          {multi ? <span className="ml-2 text-mono-s text-ink-2">hari {dayNumber(step.t)}</span> : null}
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
          <dt className="text-ink-2">Muatan tangki</dt>
          <dd className="m-0">
            <span className="num text-readout-m text-heat-ink">{formatId(step.tank.soc * 100, 0)}</span>
            <span className="num ml-1 text-mono-s text-ink-2">%</span>
          </dd>
          <dt className="mt-2 text-ink-2">Atas · bawah</dt>
          <dd className="num m-0 text-mono-s text-ink">
            {formatId(step.tank.topC, 1)} · {formatId(step.tank.bottomC, 1)} <span className="text-ink-2">°C</span>
          </dd>
        </dl>
      </div>

      <div className="mt-4 border-t border-line pt-3">
        <p className="flex items-baseline justify-between gap-3 text-label text-ink">
          <span>Pasokan air panas</span>
          <Val v={step.dhw.demandW / 1000} unit="kW" kind="th" />
        </p>
        <ul className="m-0 mt-1 list-none p-0">
          <Row swatch={<Chip className="bg-heat-mark" />} label="Langsung dari kolektor">
            <Val v={r.allocW.dhw / 1000} unit="kW" kind="th" />
          </Row>
          <Row swatch={<Chip className="border border-heat-mark bg-heat-mark/40" />} label="Dari tangki">
            <Val v={step.dhw.fromTankW / 1000} unit="kW" kind="th" />
          </Row>
          <Row swatch={<Chip className="bg-loss" />} label="Cadangan pemanas">
            <Val v={step.dhw.backupW / 1000} unit="kW" kind="th" />
          </Row>
          <Row
            swatch={<span aria-hidden="true" className="block h-0 w-2.5 shrink-0 border-t-[1.5px] border-dashed border-ink-2" />}
            label="Regenerasi desikan"
          >
            <Val v={r.allocW.desiccant / 1000} unit="kW" kind="th" />
          </Row>
        </ul>
        <p className="mt-2 text-small text-ink-2">
          {r.pumpOn ? (
            <>
              Kolektor mengirim <Val v={collectorKW} unit="kW" kind="th" />: air panas {formatId(r.allocW.dhw / 1000, 1)}, tangki {formatId(r.allocW.tank / 1000, 1)}, tidak dipakai {formatId(r.allocW.bypass / 1000, 1)}.
            </>
          ) : (
            <>Pompa kolektor mati; tidak ada panas yang dikumpulkan.</>
          )}
        </p>
      </div>

      <div className="mt-4 flex items-baseline justify-between gap-3 border-t border-line pt-3">
        <p className="inline-flex items-center gap-2 text-label text-ink">
          <BoltIcon size={12} className="shrink-0" />
          Listrik PV
        </p>
        <Val v={step.collector.electricalW / 1000} unit="kW" kind="e" />
      </div>

      <div className="mt-4 border-t border-line pt-3 text-small text-ink-2">
        <p className="text-label text-ink">Sampai {clock}</p>
        <p className="mt-1 flex flex-wrap items-baseline gap-x-4 gap-y-1">
          <span>
            surya ke air panas <Val v={cum.solarKWhTh} d={0} unit="kWh" kind="th" />
          </span>
          <span>
            cadangan <Val v={cum.backupKWhTh} d={0} unit="kWh" kind="th" />
          </span>
          <span>
            PV <Val v={cum.pvKWhE} d={0} unit="kWh" kind="e" />
          </span>
        </p>
      </div>
    </div>
  );
}
