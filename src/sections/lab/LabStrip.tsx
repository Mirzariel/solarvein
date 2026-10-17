import { LABELS } from '../../sim/system';
import { useStep } from '../../state/systemSelectors';
import { Readout, StatusDot, type Tone } from '../../ui';

/** L1 di samping skema: mode yang DIHITUNG router, alasannya, listrik PV (kW_e) dan panas ke cairan (kW_th). */
export function LabStrip() {
  const step = useStep();
  const r = step.router;
  const tone: Tone = r.mode === 'A' ? 'heat' : 'neutral';
  return (
    <div>
      <div className="grid grid-cols-2 gap-x-6 gap-y-5 lg:grid-cols-3">
        <div className="min-w-0 border-t border-line pt-3">
          <p className="text-label text-ink-2">Mode pengendali</p>
          <p className="mt-2 text-readout-m text-ink">{LABELS.mode[r.mode].split(' · ')[0]}</p>
          <p className="mt-1 text-small text-ink-2">{LABELS.mode[r.mode].split(' · ')[1]}</p>
        </div>
        <Readout label="Listrik PV" value={step.collector.electricalW / 1000} unit="kW" kind="electrical" size="md" digits={1} />
        <Readout label="Panas ke cairan" value={step.collector.qLiquidW / 1000} unit="kW" kind="thermal" size="md" digits={1} sublabel={r.pumpOn ? undefined : 'pompa mati'} />
      </div>
      <p className="mt-4 flex items-start gap-3 text-body text-ink-2">
        <StatusDot tone={tone} className="shrink-0 pt-[3px]">
          {r.pumpOn ? 'Pompa jalan' : 'Pompa mati'}
        </StatusDot>
        <span className="min-w-0">{LABELS.reason[r.reason]}</span>
      </p>
    </div>
  );
}

/** Versi satu baris untuk tumpukan lengket di layar kecil. */
export function LabMini() {
  const step = useStep();
  const r = step.router;
  const f = (w: number) => (w / 1000).toFixed(1).replace('.', ',');
  return (
    <p className="m-0 flex flex-wrap items-baseline gap-x-4 gap-y-1 border-t border-line pt-2 text-small text-ink-2">
      <span className="text-ink">Mode {r.mode}</span>
      <span>
        <span className="num text-mono-s text-ink">{f(step.collector.electricalW)}</span> kW<sub className="text-[0.7em]">e</sub>
      </span>
      <span>
        <span className="num text-mono-s text-ink">{f(step.collector.qLiquidW)}</span> kW<sub className="text-[0.7em]">th</sub>
      </span>
    </p>
  );
}
