import { useMemo } from 'react';
import { DESICCANT_ASSUMPTIONS, DESICCANT_NOT_BENEFICIAL, DESICCANT_STATUS, LABELS, MODE_TARGETS, type DesiccantEval, type RegenAirSource } from '../sim/system';
import { useDesiccantSweep } from '../state/systemSelectors';
import { EvidenceDot, formatId, formatSigned } from '../ui';
import { linear, niceTicks } from './chartKit';
import { Frame, SIZE, type Ratio } from './Frame';
import { summarize } from './refs';

/** Regeneration temperature of the side readouts (same mid-range value the sim's heatUses() uses). */
const REF_REGEN_C = 60;

const SOURCES: readonly { air: RegenAirSource; label: string; dash: string }[] = [
  { air: 'exhaust', label: 'Udara buang', dash: '9 5' },
  { air: 'ambient', label: 'Udara lingkungan', dash: '2 5' },
];

function SweepChart({ w, h, sweeps }: { w: number; h: number; sweeps: Record<RegenAirSource, DesiccantEval[]> }) {
  const m = { l: 180, r: 190, t: 28, b: 150 };
  const all = [...sweeps.exhaust, ...sweeps.ambient];
  const temps = sweeps.exhaust.map((e) => e.regenC);
  const vals = all.map((e) => e.hvac.netSavingWe);
  const lo = Math.min(0, ...vals);
  const hi = Math.max(0, ...vals);
  const pad = (hi - lo) * 0.12 || 10;
  const yTicks = niceTicks(lo - pad, hi + pad, 5);
  const y0 = Math.min(lo - pad, ...yTicks);
  const y1 = Math.max(hi + pad, ...yTicks);
  const px = linear(temps[0] ?? 35, temps[temps.length - 1] ?? 70, m.l, w - m.r);
  const py = linear(y0, y1, h - m.b, m.t);
  return (
    <svg data-export-svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} role="img" aria-label="Penghematan listrik bersih desikan menurut suhu regenerasi" className="block font-sans">
      {yTicks.map((v) => (
        <g key={v}>
          <line x1={m.l} x2={w - m.r} y1={py(v)} y2={py(v)} className="stroke-line" strokeWidth="1" />
          <text x={m.l - 12} y={py(v) + 5} textAnchor="end" className="num fill-ink-2" fontSize="15">
            {formatSigned(v, 0)}
          </text>
        </g>
      ))}
      <line x1={m.l} x2={w - m.r} y1={py(0)} y2={py(0)} className="stroke-ink" strokeWidth="1.5" />
      <text x={m.l + 8} y={py(0) - 10} className="fill-ink-3" fontSize="14">
        Penghematan listrik
      </text>
      <text x={m.l + 8} y={py(0) + 22} className="fill-ink-3" fontSize="14">
        Penambahan listrik
      </text>
      <text x={m.l - 12} y={m.t - 10} textAnchor="end" className="num fill-ink-2" fontSize="14">
        W
        <tspan dy="4" fontSize="10">
          e
        </tspan>
      </text>
      {SOURCES.map((s) => {
        const pts = sweeps[s.air].map((e) => [px(e.regenC), py(e.hvac.netSavingWe)] as const);
        const last = pts[pts.length - 1];
        return (
          <g key={s.air}>
            <path d={`M${pts.map((p) => `${p[0].toFixed(1)},${p[1].toFixed(1)}`).join('L')}`} className="fill-none stroke-ink" strokeWidth="2.5" strokeDasharray={s.dash} strokeLinecap="round" />
            {pts.map((p, i) => (
              <circle key={i} cx={p[0]} cy={p[1]} r="4.5" className="fill-paper stroke-ink" strokeWidth="2" />
            ))}
            {last ? (
              <text x={last[0] + 16} y={last[1] + 5} className="fill-ink" fontSize="17" fontWeight="500">
                {s.label}
              </text>
            ) : null}
          </g>
        );
      })}
      {temps.map((t) => (
        <g key={t}>
          <line x1={px(t)} x2={px(t)} y1={h - m.b} y2={h - m.b + 6} className="stroke-tick" strokeWidth="1" />
          <text x={px(t)} y={h - m.b + 26} textAnchor="middle" className="num fill-ink-2" fontSize="15">
            {t}
          </text>
        </g>
      ))}
      <text x={(m.l + w - m.r) / 2} y={h - m.b + 52} textAnchor="middle" className="num fill-ink-3" fontSize="14">
        Suhu regenerasi, °C
      </text>
      {SOURCES.map((s, r) => (
        <g key={s.air}>
          <line x1={m.l - 20} x2={w - m.r + 20} y1={h - m.b + 70 + r * 30} y2={h - m.b + 70 + r * 30} className="stroke-line" strokeWidth="1" />
          <text x={m.l - 50} y={h - m.b + 92 + r * 30} textAnchor="end" className="fill-ink-2" fontSize="15">
            {s.label}
          </text>
          {sweeps[s.air].map((e) => (
            <text key={e.regenC} x={px(e.regenC)} y={h - m.b + 92 + r * 30} textAnchor="middle" className="fill-ink" fontSize="14">
              {LABELS.verdict[e.verdict]}
            </text>
          ))}
        </g>
      ))}
    </svg>
  );
}

export function DesiccantFigure({ id, ratio }: { id: string; ratio: Ratio }) {
  const exhaust = useDesiccantSweep('exhaust');
  const ambient = useDesiccantSweep('ambient');
  const wide = ratio === '16x9';
  const bodyW = SIZE[ratio].w - 128;
  const sweeps = useMemo(() => ({ exhaust, ambient }), [exhaust, ambient]);
  const ev = useMemo(() => summarize(DESICCANT_ASSUMPTIONS, { tags: ['hipotesis', 'simulasi'], refIds: [...new Set([...exhaust, ...ambient].flatMap((e) => e.refIds))] }), [exhaust, ambient]);
  const ref = exhaust.find((e) => e.regenC === REF_REGEN_C) ?? exhaust[Math.floor(exhaust.length / 2)];
  const viable = exhaust.filter((e) => e.verdict === 'layak');
  const anyBenefit = [...exhaust, ...ambient].some((e) => e.verdict !== 'tidak-layak');
  const at = MODE_TARGETS.A;
  const chartW = wide ? bodyW - 400 : bodyW;
  const chartH = wide ? 580 : 800;

  return (
    <Frame
      id={id}
      ratio={ratio}
      title="Desikan: penghematan listrik bersih menurut suhu regenerasi"
      subtitle={
        <>
          <span className="inline-flex items-center gap-2">
            <EvidenceDot tag="hipotesis" size={12} />
            {DESICCANT_STATUS}.
          </span>{' '}
          Listrik koil pendingin acuan dikurangi after-cooler, kipas, pompa, dan penalti PV. Kondisi: {LABELS.scenario[at.scenario].toLowerCase()} pukul {String(at.hour).padStart(2, '0')}.00; batas atas.
        </>
      }
      {...ev}
    >
      <div className={wide ? 'flex gap-10' : 'flex flex-col gap-8'}>
        <div className="flex-none">
          <SweepChart w={chartW} h={chartH} sweeps={sweeps} />
        </div>
        <div className={wide ? 'flex w-[360px] flex-none flex-col gap-5' : 'grid grid-cols-2 gap-x-8 gap-y-5'}>
          <div className="border-t border-line-strong pt-3">
            <p className="m-0 text-ink" style={{ fontSize: 22, lineHeight: '30px', fontWeight: 500 }}>
              {anyBenefit
                ? viable.length
                  ? `Layak mulai ${formatId(viable[0]!.regenC, 0)} °C dengan udara buang.`
                  : 'Marginal pada sebagian suhu; belum layak.'
                : DESICCANT_NOT_BENEFICIAL}
            </p>
          </div>
          {ref ? (
            <>
              <div className="border-t border-line-strong pt-3">
                <p className="m-0 flex items-center gap-2 text-ink-2" style={{ fontSize: 17 }}>
                  Titik impas rasio COP
                  <EvidenceDot tag="simulasi" size={10} />
                </p>
                <p className="num m-0 text-ink" style={{ fontSize: 34, lineHeight: '42px' }}>
                  {ref.breakEvenCopRatio === null ? 'tak ada' : `${formatId(ref.breakEvenCopRatio, 2)}×`}
                </p>
                <p className="m-0 text-ink-3" style={{ fontSize: 14 }}>
                  After-cooler dibanding koil, udara buang {formatId(ref.regenC, 0)} °C
                </p>
              </div>
              <div className="border-t border-line-strong pt-3">
                <p className="m-0 flex items-center gap-2 text-ink-2" style={{ fontSize: 17 }}>
                  Listrik per kg air terambil
                  <EvidenceDot tag="simulasi" size={10} />
                </p>
                <p className="num m-0 text-ink" style={{ fontSize: 28, lineHeight: '36px' }}>
                  {formatId(ref.perKgWater.desiccantKWhE, 2)} <span style={{ fontSize: 16 }} className="text-ink-2">desikan</span>
                </p>
                <p className="num m-0 text-ink" style={{ fontSize: 28, lineHeight: '36px' }}>
                  {formatId(ref.perKgWater.coilRefKWhE, 2)} <span style={{ fontSize: 16 }} className="text-ink-2">koil acuan</span>
                </p>
                <p className="num m-0 text-ink-3" style={{ fontSize: 14 }}>
                  kWh<sub>e</sub> per kg
                </p>
              </div>
            </>
          ) : null}
        </div>
      </div>
    </Frame>
  );
}
