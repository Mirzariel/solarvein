import { useMemo, type ReactNode } from 'react';
import { MODEL_CONSTANTS } from '../../sim';
import { MODE_LABEL, useSimResult, useStore } from '../../state';
import { ArrowIcon, InfoTip, MINUS, Readout, StatusDot, cx, formatId, type Tone } from '../../ui';
import { describeRegime } from '../hero/regime';

function Cell({ label, children, tip, className }: { label: ReactNode; children: ReactNode; tip?: ReactNode; className?: string }) {
  return (
    <div className={cx('min-w-0 border-t border-line pt-3', className)}>
      <p className="flex items-center gap-2 text-label text-ink-2">
        <span className="truncate">{label}</span>
        {tip ? <InfoTip label={`Keterangan: ${typeof label === 'string' ? label : ''}`}>{tip}</InfoTip> : null}
      </p>
      <div className="mt-2">{children}</div>
    </div>
  );
}

/** Empat pembacaan L1 di samping skematik: mode, arah panas, listrik PV (W_e), panas ke cairan (W_th, bertanda). */
export function LabStrip() {
  const r = useSimResult();
  const mode = useStore((s) => s.mode);
  const statement = useMemo(() => describeRegime(r), [r]);

  const flowing = r.pumpOn && Math.abs(r.qLiquidW) > MODEL_CONSTANTS.minHeatFlowW;
  const dir = !flowing ? 0 : r.qLiquidW > 0 ? 1 : -1;
  const tone: Tone = statement.tone === 'heat' ? 'heat' : statement.tone === 'cool' ? 'cool' : 'neutral';

  return (
    <div>
      <div className="grid grid-cols-2 gap-x-6 gap-y-5 lg:grid-cols-4">
        <Cell label="Mode">
          <p className="text-readout-m text-ink">{MODE_LABEL[mode]}</p>
        </Cell>
        <Cell label="Arah panas">
          <p
            className={cx(
              'flex items-center gap-2 text-readout-m',
              dir > 0 ? 'text-heat-ink' : dir < 0 ? 'text-cool-ink' : 'text-ink-2',
            )}
          >
            {dir !== 0 ? <ArrowIcon size={20} direction={dir > 0 ? 'down' : 'up'} /> : null}
            <span className="text-body font-medium">{dir > 0 ? 'Panel ke cairan' : dir < 0 ? 'Cairan ke panel' : r.pumpOn ? 'Nyaris nol' : 'Pompa mati'}</span>
          </p>
        </Cell>
        <Readout label="Listrik PV" value={r.electricalW} unit="W" kind="electrical" size="md" digits={0} />
        <Readout
          label="Panas ke cairan"
          value={r.qLiquidW}
          unit="W"
          kind="thermal"
          signed
          digits={0}
          positiveHint="panen"
          negativeHint="buang"
        />
      </div>
      <p className="mt-4 flex items-start gap-3 text-body text-ink-2">
        <StatusDot tone={tone} className="shrink-0 pt-[3px]">
          {statement.pill}
        </StatusDot>
        <span className="min-w-0">{statement.headline}</span>
      </p>
    </div>
  );
}

/** Versi satu baris untuk tumpukan lengket di layar kecil: mode, W_e, W_th bertanda. */
export function LabMini() {
  const r = useSimResult();
  const mode = useStore((s) => s.mode);
  const q = Math.round(r.qLiquidW);
  return (
    <p className="m-0 flex flex-wrap items-baseline gap-x-4 gap-y-1 border-t border-line pt-2 text-small text-ink-2">
      <span className="text-ink">{MODE_LABEL[mode]}</span>
      <span>
        <span className="num text-mono-s text-ink">{formatId(r.electricalW, 0)}</span> W<sub className="text-[0.7em]">e</sub>
      </span>
      <span className={q > 0 ? 'text-heat-ink' : q < 0 ? 'text-cool-ink' : undefined}>
        <span className="num text-mono-s">
          {q > 0 ? '+' : q < 0 ? MINUS : ''}
          {formatId(Math.abs(q), 0)}
        </span>{' '}
        W<sub className="text-[0.7em]">th</sub>
      </span>
    </p>
  );
}
