import { useId } from 'react';
import { DESICCANT_STATUS, LABELS, type DayStep, type Sink } from '../../sim/system';
import { useStep } from '../../state/systemSelectors';
import { useSystemStore } from '../../state/system';
import { formatId } from '../../ui';

/**
 * Skema sistem untuk langkah yang sedang dipilih (satu SVG 1 px, label mono). Alur selalu satu arah: sel, cairan,
 * router, tujuan. Lebar cabang sebanding dengan daya panas (W_th) yang dialokasikan router; jumlahnya tetap saat
 * pompa jalan dan cabang hilang saat pompa mati. Putus-putus = belum divalidasi (desikan). Semua nilai berasal dari
 * DayStep (interpolasi pada jam yang dipilih); tidak ada gerak yang tidak dihitung simulasi.
 */
const MONO = "var(--font-mono, 'Geist Mono Variable', ui-monospace, monospace)";
const SANS = "var(--font-sans, 'Geist Variable', system-ui, sans-serif)";
const HEAT = 'var(--color-heat-mark)';
const INK = 'var(--color-ink)';
const INK2 = 'var(--color-ink-2)';
const LOSS = 'var(--color-loss)';
const LINE = 'var(--color-line-strong)';
const HALO = { paintOrder: 'stroke', stroke: 'var(--color-surface)', strokeWidth: 3, strokeLinejoin: 'round' } as const;

const kw = (w: number, d = 0) => formatId(w / 1000, d);
const BRANCH_MAX = 22;

function Kw({ x, y, w, anchor = 'start', size = 12.5 }: { x: number; y: number; w: number; anchor?: 'start' | 'end' | 'middle'; size?: number }) {
  return (
    <text x={x} y={y} textAnchor={anchor} fontFamily={MONO} fontSize={size} fill={INK} fontWeight={500} style={HALO}>
      {kw(w, Math.abs(w) < 10000 ? 1 : 0)}
      <tspan fill={INK2} fontWeight={400}>
        {' '}
        kW
      </tspan>
      <tspan fill={INK2} fontSize={size * 0.72} dy={size * 0.25} fontWeight={400}>
        th
      </tspan>
    </text>
  );
}

function Temp({ x, y, label, c, anchor = 'start', size = 12 }: { x: number; y: number; label: string; c: number | null; anchor?: 'start' | 'end' | 'middle'; size?: number }) {
  return (
    <text x={x} y={y} textAnchor={anchor} fontFamily={MONO} fontSize={size} fill={INK2} style={HALO}>
      {label}{' '}
      <tspan fill={INK} fontWeight={500}>
        {c === null ? '—' : formatId(c, 1)}
      </tspan>{c === null ? '' : ' °C'}
    </text>
  );
}

const SINK_LABEL: Record<Sink, string> = { dhw: 'Air panas', tank: 'Tangki', desiccant: 'Desikan', bypass: 'Tidak dipakai' };

export function LabSchematic({ compact = false, className }: { compact?: boolean; className?: string }) {
  const step = useStep();
  const modules = useSystemStore((s) => s.sys.array.modules);
  const areaM2 = useSystemStore((s) => s.sys.array.modules * s.sys.array.module.areaM2);
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  return compact ? (
    <Compact step={step} modules={modules} areaM2={areaM2} uid={uid} className={className} />
  ) : (
    <Wide step={step} modules={modules} areaM2={areaM2} uid={uid} className={className} />
  );
}

interface Common {
  step: DayStep;
  modules: number;
  areaM2: number;
  uid: string;
  className?: string;
}

function describe(step: DayStep): string {
  const r = step.router;
  const q = step.collector.qLiquidW;
  return `Skema sistem pada jam ${formatId(step.hourOfDay, 1)}. ${LABELS.mode[r.mode]}. ${
    r.pumpOn
      ? `Pompa jalan, panas ke cairan ${kw(q, 1)} kW termal: air panas ${kw(r.allocW.dhw, 1)}, tangki ${kw(r.allocW.tank, 1)}, desikan ${kw(r.allocW.desiccant, 1)}, tidak dipakai ${kw(r.allocW.bypass, 1)}.`
      : 'Pompa mati, tidak ada pengumpulan panas.'
  } Tangki atas ${formatId(step.tank.topC, 1)} °C, bawah ${formatId(step.tank.bottomC, 1)} °C.`;
}

function Tank({ x, y, w, h, soc, uid }: { x: number; y: number; w: number; h: number; soc: number; uid: string }) {
  const fillH = Math.max(0, Math.min(1, soc)) * (h - 2);
  return (
    <g>
      <clipPath id={`${uid}tk`}>
        <rect x={x + 1} y={y + 1} width={w - 2} height={h - 2} rx={5} />
      </clipPath>
      <rect x={x} y={y} width={w} height={h} rx={6} fill="var(--color-surface)" stroke={INK} strokeWidth={1} />
      <rect x={x + 1} y={y + h - 1 - fillH} width={w - 2} height={fillH} fill={HEAT} opacity={0.55} clipPath={`url(#${uid}tk)`} />
    </g>
  );
}

/** Pita cabang: kurva dari titik router ke tujuan; lebar sebanding valve (jumlah = BRANCH_MAX). */
function Branch({ d, valve, on, kind }: { d: string; valve: number; on: boolean; kind: Sink }) {
  if (!on || valve <= 0.003) return <path d={d} fill="none" stroke={LINE} strokeWidth={1} strokeDasharray="1 4" strokeLinecap="round" />;
  const w = Math.max(1.5, valve * BRANCH_MAX);
  if (kind === 'desiccant')
    return <path d={d} fill="none" stroke={HEAT} strokeWidth={w} strokeDasharray="7 4" opacity={0.9} />;
  return <path d={d} fill="none" stroke={kind === 'bypass' ? LOSS : HEAT} strokeWidth={w} opacity={kind === 'bypass' ? 0.9 : 0.85} />;
}

function Wide({ step, modules, areaM2, uid, className }: Common) {
  const r = step.router;
  const c = step.collector;
  const on = r.pumpOn;
  const VB_W = 680;
  const VB_H = 298;
  const hubX = 248;
  const hubY = 138;
  const dest: Record<Sink, number> = { dhw: 46, tank: 132, desiccant: 208, bypass: 270 };
  const path = (k: Sink) => `M${hubX + 6} ${hubY} C ${hubX + 90} ${hubY}, ${hubX + 80} ${dest[k]}, 418 ${dest[k]}`;
  const draw = step.dhw;
  const tankW = draw.demandW > 0 ? Math.min(1, draw.fromTankW / Math.max(draw.demandW, 1)) : 0;
  return (
    <svg viewBox={`0 0 ${VB_W} ${VB_H}`} className={className ?? 'h-auto w-full'} role="img" aria-label={describe(step)}>
      {/* kolektor */}
      <text x={16} y={82} fontFamily={SANS} fontSize={12} fill={INK2}>
        Panel PV/T
      </text>
      <text x={16} y={98} fontFamily={MONO} fontSize={12} fill={INK}>
        {modules} modul · {formatId(areaM2, 0)} m²
      </text>
      <rect x={16} y={108} width={150} height={60} rx={3} fill="var(--color-surface)" stroke={INK} strokeWidth={1} />
      {Array.from({ length: 5 }, (_, i) => (
        <line key={i} x1={16 + ((i + 1) * 150) / 6} x2={16 + ((i + 1) * 150) / 6} y1={108} y2={168} stroke={LINE} strokeWidth={1} />
      ))}
      <line x1={16} x2={166} y1={138} y2={138} stroke={on ? HEAT : LINE} strokeWidth={on ? 3 : 1} />
      <Temp x={16} y={190} label="Masuk" c={c.inletC} />
      <Temp x={16} y={206} label="Keluar" c={on ? c.outletC : null} />
      <Temp x={16} y={222} label="Sel" c={c.cellC} />
      <text x={16} y={242} fontFamily={SANS} fontSize={12} fill={INK2}>
        {on ? 'Pompa jalan' : 'Pompa mati'}
      </text>

      {/* pipa utama ke router */}
      <path d={`M166 138 H${hubX - 6}`} stroke={on ? HEAT : LINE} strokeWidth={on ? BRANCH_MAX : 1} opacity={on ? 0.85 : 1} fill="none" strokeDasharray={on ? undefined : '1 4'} strokeLinecap={on ? 'butt' : 'round'} />
      {on ? <Kw x={176} y={hubY - 18} w={c.qLiquidW} /> : null}
      <circle cx={hubX} cy={hubY} r={6} fill={INK} />
      <text x={hubX} y={hubY + 28} textAnchor="middle" fontFamily={SANS} fontSize={12} fill={INK2}>
        Router
      </text>

      {/* cabang */}
      {(['dhw', 'tank', 'desiccant', 'bypass'] as Sink[]).map((k) => (
        <Branch key={k} d={path(k)} valve={r.valves[k]} on={on} kind={k} />
      ))}

      {/* air panas */}
      <g>
        <rect x={420} y={8} width={246} height={76} rx={3} fill="none" stroke={INK} strokeWidth={1} />
        <text x={430} y={26} fontFamily={SANS} fontSize={12} fill={INK2}>
          {LABELS.sink.dhw}
        </text>
        <Kw x={656} y={26} w={r.allocW.dhw} anchor="end" />
        <Temp x={430} y={46} label="air keluar penukar" c={draw.potableOutC ?? null} />
        <text x={430} y={66} fontFamily={MONO} fontSize={12} fill={INK2} style={HALO}>
          pemanas cadangan <tspan fill={INK} fontWeight={500}>{kw(draw.backupW, 1)}</tspan> kW<tspan fontSize={9} dy={3}>th</tspan>
        </text>
      </g>
      {/* tangki: pelepasan ke air panas (rantai seri), bukan lewat router */}
      {tankW > 0.005 ? <path d="M446 98 V84" stroke={HEAT} strokeWidth={Math.max(1.5, tankW * 14)} opacity={0.85} fill="none" /> : null}

      {/* tangki */}
      <g>
        <Tank x={430} y={98} w={40} h={68} soc={step.tank.soc} uid={uid} />
        <text x={482} y={112} fontFamily={SANS} fontSize={12} fill={INK2}>
          {LABELS.sink.tank}
        </text>
        <Kw x={656} y={112} w={r.allocW.tank} anchor="end" />
        <Temp x={482} y={130} label="atas" c={step.tank.topC} />
        <Temp x={482} y={146} label="bawah" c={step.tank.bottomC} />
        <text x={482} y={162} fontFamily={MONO} fontSize={12} fill={INK2} style={HALO}>
          isi <tspan fill={INK} fontWeight={500}>{formatId(step.tank.soc * 100, 0)}</tspan> %
        </text>
      </g>

      {/* desikan */}
      <g>
        <rect x={420} y={182} width={246} height={52} rx={3} fill="none" stroke={INK2} strokeWidth={1} strokeDasharray="4 3" />
        <text x={430} y={200} fontFamily={SANS} fontSize={12} fill={INK2}>
          Regenerasi desikan
        </text>
        <Kw x={656} y={200} w={r.allocW.desiccant} anchor="end" />
        <text x={430} y={222} fontFamily={SANS} fontSize={12} fill={INK2}>
          {DESICCANT_STATUS}
        </text>
      </g>

      {/* bypass */}
      <g>
        <rect x={420} y={246} width={246} height={44} rx={3} fill="none" stroke={LOSS} strokeWidth={1} />
        <text x={430} y={264} fontFamily={SANS} fontSize={12} fill={INK2}>
          Tidak dipakai (bypass)
        </text>
        <Kw x={656} y={264} w={r.allocW.bypass} anchor="end" />
        <text x={430} y={281} fontFamily={SANS} fontSize={11.5} fill={INK2}>
          Ke pembuang panas (dry cooler)
        </text>
      </g>
    </svg>
  );
}

function Compact({ step, modules, areaM2, uid, className }: Common) {
  const r = step.router;
  const c = step.collector;
  const on = r.pumpOn;
  const VB_W = 360;
  const VB_H = 318;
  const hubX = 180;
  const hubY = 112;
  const cols: { k: Sink; x: number }[] = [
    { k: 'dhw', x: 8 },
    { k: 'tank', x: 94 },
    { k: 'desiccant', x: 180 },
    { k: 'bypass', x: 266 },
  ];
  const colW = 84;
  const draw = step.dhw;
  return (
    <svg viewBox={`0 0 ${VB_W} ${VB_H}`} className={className ?? 'h-auto w-full'} role="img" aria-label={describe(step)}>
      <text x={10} y={16} fontFamily={SANS} fontSize={13} fill={INK2}>
        Panel PV/T
      </text>
      <text x={VB_W - 10} y={16} textAnchor="end" fontFamily={MONO} fontSize={13} fill={INK}>
        {modules} modul · {formatId(areaM2, 0)} m²
      </text>
      <rect x={10} y={24} width={340} height={30} rx={3} fill="var(--color-surface)" stroke={INK} strokeWidth={1} />
      {Array.from({ length: 9 }, (_, i) => (
        <line key={i} x1={10 + ((i + 1) * 340) / 10} x2={10 + ((i + 1) * 340) / 10} y1={24} y2={54} stroke={LINE} strokeWidth={1} />
      ))}
      <line x1={10} x2={350} y1={39} y2={39} stroke={on ? HEAT : LINE} strokeWidth={on ? 3 : 1} />
      <Temp x={10} y={74} label="Masuk" c={c.inletC} size={13} />
      <Temp x={VB_W - 10} y={74} label="Keluar" c={on ? c.outletC : null} anchor="end" size={13} />
      <Temp x={10} y={92} label="Sel" c={c.cellC} size={13} />
      <text x={VB_W - 10} y={92} textAnchor="end" fontFamily={SANS} fontSize={13} fill={INK2}>
        {on ? 'Pompa jalan' : 'Pompa mati'}
      </text>

      <path d={`M${hubX} 54 V${hubY - 6}`} stroke={on ? HEAT : LINE} strokeWidth={on ? 14 : 1} fill="none" opacity={on ? 0.85 : 1} strokeDasharray={on ? undefined : '1 4'} strokeLinecap="round" />
      <circle cx={hubX} cy={hubY} r={6} fill={INK} />
      <text x={hubX + 14} y={hubY + 4} fontFamily={SANS} fontSize={13} fill={INK2}>
        Router
      </text>

      {cols.map(({ k, x }) => {
        const cx = x + colW / 2;
        const d = `M${hubX} ${hubY + 6} C ${hubX} 160, ${cx} 150, ${cx} 186`;
        const val = r.valves[k];
        if (!on || val <= 0.003) return <path key={k} d={d} fill="none" stroke={LINE} strokeWidth={1} strokeDasharray="1 4" strokeLinecap="round" />;
        const w = Math.max(1.5, val * 14);
        return (
          <path key={k} d={d} fill="none" stroke={k === 'bypass' ? LOSS : HEAT} strokeWidth={w} strokeDasharray={k === 'desiccant' ? '6 4' : undefined} opacity={0.88} />
        );
      })}

      {cols.map(({ k, x }) => (
        <g key={k}>
          <rect
            x={x}
            y={188}
            width={colW}
            height={124}
            rx={3}
            fill="none"
            stroke={k === 'bypass' ? LOSS : k === 'desiccant' ? INK2 : INK}
            strokeDasharray={k === 'desiccant' ? '4 3' : undefined}
          />
          <text x={x + 8} y={208} fontFamily={SANS} fontSize={13} fill={INK2}>
            {SINK_LABEL[k]}
          </text>
          <Kw x={x + 8} y={226} w={r.allocW[k]} size={13} />
          {k === 'dhw' ? (
            <>
              <text x={x + 8} y={252} fontFamily={SANS} fontSize={12} fill={INK2}>
                air keluar
              </text>
              <text x={x + 8} y={270} fontFamily={MONO} fontSize={13} fill={INK} fontWeight={500}>
                {formatId(draw.potableOutC ?? 0, 1)} °C
              </text>
              <text x={x + 8} y={292} fontFamily={SANS} fontSize={12} fill={INK2}>
                cadangan
              </text>
              <text x={x + 8} y={306} fontFamily={MONO} fontSize={12} fill={INK}>
                {kw(draw.backupW, 1)} kW<tspan fontSize={9} dy={3}>th</tspan>
              </text>
            </>
          ) : null}
          {k === 'tank' ? (
            <>
              <Tank x={x + 8} y={238} w={26} h={50} soc={step.tank.soc} uid={uid} />
              <text x={x + 40} y={252} fontFamily={MONO} fontSize={12} fill={INK} style={HALO}>
                {formatId(step.tank.topC, 0)}°
              </text>
              <text x={x + 40} y={284} fontFamily={MONO} fontSize={12} fill={INK2} style={HALO}>
                {formatId(step.tank.bottomC, 0)}°
              </text>
              <text x={x + 8} y={306} fontFamily={MONO} fontSize={12} fill={INK2}>
                isi {formatId(step.tank.soc * 100, 0)} %
              </text>
            </>
          ) : null}
          {k === 'desiccant' ? (
            <>
              <text x={x + 8} y={252} fontFamily={SANS} fontSize={12} fill={INK2}>
                Hipotesis
              </text>
              <text x={x + 8} y={268} fontFamily={SANS} fontSize={12} fill={INK2}>
                riset · belum
              </text>
              <text x={x + 8} y={284} fontFamily={SANS} fontSize={12} fill={INK2}>
                divalidasi
              </text>
            </>
          ) : null}
          {k === 'bypass' ? (
            <>
              <text x={x + 8} y={252} fontFamily={SANS} fontSize={12} fill={INK2}>
                ke pembuang panas
              </text>
              <text x={x + 8} y={268} fontFamily={SANS} fontSize={12} fill={INK2}>
                (dry cooler)
              </text>
            </>
          ) : null}
        </g>
      ))}
    </svg>
  );
}
