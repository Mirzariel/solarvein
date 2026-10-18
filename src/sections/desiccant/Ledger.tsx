import type { ReactNode } from 'react';
import { DESICCANT_NOT_BENEFICIAL, LABELS, type DesiccantEvalDetail } from '../../sim/system';
import { linear } from '../../charts/day/scales';
import { formatId, formatWithUnit } from '../../ui';
import { Val } from '../day/units';

const kW = (w: number) => w / 1000;

/** The five cost terms of the desiccant route, from the evaluation (residual coil = what the identity leaves). */
export function ledgerTerms(e: DesiccantEvalDetail) {
  const h = e.hvac;
  const residual = Math.max(0, h.coilRefWe - h.netSavingWe - h.aftercoolerWe - h.fanWe - h.pumpWe - h.pvPenaltyWe);
  return { ref: h.coilRefWe, after: h.aftercoolerWe, residual, fan: h.fanWe, pump: h.pumpWe, pv: h.pvPenaltyWe, net: h.netSavingWe };
}

function Row({ sign, label, children, strong }: { sign: string; label: string; children: ReactNode; strong?: boolean }) {
  return (
    <li className={`grid grid-cols-[1.25rem_1fr_auto] items-baseline gap-x-2 border-t py-2 ${strong ? 'border-ink' : 'border-line'}`}>
      <span className="num text-ink-3" aria-hidden="true">{sign}</span>
      <span className={strong ? 'text-body font-medium text-ink' : 'text-body text-ink-2'}>{label}</span>
      {children}
    </li>
  );
}

/** Where the selected ratio sits against break-even, on 1,0–2,2 (a 1-D instrument, not a chart). */
function RatioScale({ ratio, breakEven }: { ratio: number; breakEven: number | null }) {
  const W = 320;
  const X = linear(1, 2.2, 8, W - 8);
  const marks = [1.3, 1.5, 2.0];
  return (
    <svg viewBox={`0 0 ${W} 46`} width="100%" height="46" className="block max-w-[360px]" role="img" aria-label={`Rasio COP ${formatId(ratio, 1)}${breakEven ? `, impas ${formatId(breakEven, 2)}` : ''}`}>
      <line x1={X(1)} x2={X(2.2)} y1={20} y2={20} stroke="var(--color-line-strong)" strokeWidth="1" />
      {breakEven ? <line x1={X(1)} x2={X(breakEven)} y1={20} y2={20} stroke="var(--color-ink)" strokeWidth="2" /> : null}
      {marks.map((m) => (
        <g key={m}>
          <line x1={X(m)} x2={X(m)} y1={16} y2={24} stroke="var(--color-tick)" strokeWidth="1" />
          <text x={X(m)} y={40} textAnchor="middle" fill="var(--color-ink-3)" fontFamily="var(--font-mono)" fontSize="11">
            {formatId(m, 1)}
          </text>
        </g>
      ))}
      {breakEven ? (
        <g>
          <line x1={X(breakEven)} x2={X(breakEven)} y1={10} y2={30} stroke="var(--color-ink)" strokeWidth="1.5" />
          <text x={X(breakEven)} y={7} textAnchor="middle" fill="var(--color-ink)" fontFamily="var(--font-mono)" fontSize="11">
            impas {formatId(breakEven, 2)}
          </text>
        </g>
      ) : null}
      <path d={`M ${X(ratio)} 21 l -4 7 h 8 Z`} fill="var(--color-ink)" />
    </svg>
  );
}

export function Ledger({ e, ratio, airLabel }: { e: DesiccantEvalDetail; ratio: number; airLabel: string }) {
  const t = ledgerTerms(e);
  const route = t.after + t.residual + t.fan + t.pump + t.pv;
  const seg = (w: number) => `${Math.max(0, (w / Math.max(1, t.ref)) * 100)}%`;
  const net = kW(t.net);
  const verdict = !e.operating ? 'tidak beroperasi' : `${LABELS.verdict[e.verdict]}${e.nearBreakEven ? ' (≈ impas)' : ''}`;
  const notBeneficial = !e.operating || t.net <= 0;
  const share = t.ref > 0 ? (t.net / t.ref) * 100 : 0;

  return (
    <div>
      <h3 className="text-h3 text-ink">
        Neraca untuk <span className="num">{formatId(e.regenC, 0)}</span> °C
      </h3>
      <p className="mt-1 text-small text-ink-2">
        {airLabel}, rasio COP pendingin lanjutan/koil <span className="num text-ink">{formatId(ratio, 1)}</span>.
      </p>

      {e.operating ? (
        <>
          <ul className="m-0 mt-5 list-none p-0">
            <Row sign="" label="Koil acuan, satu koil">
              <Val v={kW(t.ref)} d={2} unit="kW" kind="e" />
            </Row>
            <Row sign="−" label="Pendingin lanjutan (after-cooler)">
              <Val v={kW(t.after)} d={2} unit="kW" kind="e" />
            </Row>
            <Row sign="−" label="Koil sisa">
              <Val v={kW(t.residual)} d={2} unit="kW" kind="e" />
            </Row>
            <Row sign="−" label="Kipas, dua aliran">
              <Val v={kW(t.fan)} d={2} unit="kW" kind="e" />
            </Row>
            <Row sign="−" label="Pompa">
              <Val v={kW(t.pump)} d={2} unit="kW" kind="e" />
            </Row>
            <Row sign="−" label="Penalti PV">
              <Val v={kW(t.pv)} d={2} unit="kW" kind="e" />
            </Row>
            <Row sign="=" label="Hemat bersih" strong>
              <Val v={net} d={2} unit="kW" kind="e" signed className="num text-readout-m text-ink" />
            </Row>
          </ul>

          <div aria-hidden="true" className="mt-4 space-y-1.5">
            <div className="flex h-2 w-full">
              <span className="block h-full bg-ink" style={{ width: '100%' }} />
            </div>
            <div className="flex h-2 w-full overflow-hidden">
              <span className="block h-full bg-ink-2" style={{ width: seg(t.after) }} />
              <span className="block h-full bg-ink-3" style={{ width: seg(t.residual) }} />
              <span className="block h-full bg-tick" style={{ width: seg(t.fan + t.pump + t.pv) }} />
            </div>
          </div>
          <p className="mt-2 text-small text-ink-2">
            Bar atas: koil acuan. Bar bawah: jalur desikan (<span className="num">{formatWithUnit((route / Math.max(1, t.ref)) * 100, '%', 0)}</span> dari acuan).
          </p>

          <p className="mt-5 text-label text-ink">Per kg kelembapan yang harus dibuang</p>
          <p className="mt-1 text-small text-ink-2">
            Desikan <Val v={e.perKgWater.desiccantKWhE} d={2} unit="kWh" kind="e" /> · kompresor <Val v={e.perKgWater.coilRefKWhE} d={2} unit="kWh" kind="e" />
          </p>
        </>
      ) : (
        <p className="mt-5 text-body text-ink-2">Pada suhu ini unggun menyerap hampir tidak ada uap, sehingga unit tidak dijalankan dan tidak ada neraca.</p>
      )}

      <p className="mt-5 text-label text-ink">Impas rasio COP</p>
      <RatioScale ratio={ratio} breakEven={e.breakEvenCopRatio} />

      <p className="mt-4 text-body text-ink">
        {notBeneficial ? <>{DESICCANT_NOT_BENEFICIAL} </> : null}
        {!e.operating ? (
          <>Putusan: {verdict.toLowerCase()}.</>
        ) : notBeneficial ? (
          <>Hematnya <Val v={net} d={2} unit="kW" kind="e" signed /> berarti listrik bertambah. Putusan: {verdict.toLowerCase()}.</>
        ) : (
          <>
            Hemat bersih hanya <span className="num">{formatWithUnit(share, '%', 1)}</span> dari koil acuan, masih dalam ketidakpastian model. Putusan: {verdict.toLowerCase()}.
          </>
        )}
      </p>
      {e.operating && t.pv === 0 && t.pump === 0 ? (
        <p className="mt-2 text-small text-ink-2">Penalti PV dan daya pompa bernilai 0 di sini, sehingga angka ini batas atas; simulasi sehari penuh membebankannya.</p>
      ) : null}
    </div>
  );
}
