import { useMemo, useState, type ReactNode } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type TooltipContentProps,
} from 'recharts';
import { summarizeDay, type DayScenario } from '../sim';
import { useLaggedDayProfile, useStore } from '../state';
import { Disclosure, Readout, RainIcon, SegmentedControl, SunIcon } from '../ui';
import { fmt, fmtSigned } from './format';
import { AXIS_LINE, AXIS_TICK, COLOR, GRID_LINE } from './theme';

interface Row {
  hour: number;
  g: number;
  rain: number;
  ambient: number;
  cell: number;
  tIn: number;
  /** null saat pompa mati (tidak ada aliran, jadi tidak ada T keluar bermakna). */
  tOut: number | null;
  q: number;
  pe: number;
  pump: number;
  pumpOn: boolean;
}

const hourTick = (h: number) => String(h).padStart(2, '0');
/** Ruang kanan untuk label langsung di ujung garis. */
const MARGIN = { top: 8, right: 64, bottom: 0, left: 0 };
const H = 144;
const Y_WIDTH = 44;
/** Ukuran awal sebelum ResizeObserver mengukur — mencegah area kosong / lebar 0 saat pertama dirender. */
const INITIAL = { width: 640, height: H };

interface Field {
  label: string;
  get: (r: Row) => number | null;
  digits: number;
  unit: string;
  swatch: string;
  signed?: boolean;
}

/** Tooltip terang, angka mono tabular, tanpa dekorasi. */
function makeTooltip(rows: Row[], fields: Field[]) {
  return function DayTooltip({ active, label }: TooltipContentProps) {
    if (!active || label === undefined) return null;
    const row = rows.find((r) => r.hour === Number(label));
    if (!row) return null;
    return (
      <div className="rounded-sm border border-line-strong bg-surface px-3 py-2 text-label shadow-pop">
        <p className="num text-mono-s text-ink">{hourTick(row.hour)}:00</p>
        <ul className="mt-2 space-y-1">
          {fields.map((f) => {
            const v = f.get(row);
            return (
              <li key={f.label} className="flex items-center justify-between gap-4">
                <span className="inline-flex items-center gap-2 text-ink-2">
                  <span aria-hidden="true" className="inline-block h-0.5 w-3 rounded-xs" style={{ background: f.swatch }} />
                  {f.label}
                </span>
                <span className="num text-mono-s text-ink">
                  {v === null ? '—' : f.signed ? fmtSigned(v, f.digits) : fmt(v, f.digits)} <span className="text-ink-3">{f.unit}</span>
                </span>
              </li>
            );
          })}
        </ul>
      </div>
    );
  };
}

function MiniHeader({ title, unit, note }: { title: ReactNode; unit?: ReactNode; note?: ReactNode }) {
  return (
    <div className="mb-2 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-t border-line pt-3">
      <h4 className="m-0 text-label text-ink">
        {title} {unit ? <span className="mono ml-1 font-normal text-ink-3">{unit}</span> : null}
      </h4>
      {note ? <div className="text-mono-label text-ink-2">{note}</div> : null}
    </div>
  );
}

const grid = <CartesianGrid {...GRID_LINE} vertical={false} />;
const cursorLine = { stroke: 'var(--color-ink-3)', strokeDasharray: '3 3' };

function xAxis(show: boolean) {
  return (
    <XAxis
      dataKey="hour"
      tickFormatter={hourTick}
      tick={show ? AXIS_TICK : false}
      axisLine={AXIS_LINE}
      tickLine={false}
      height={show ? 24 : 4}
      minTickGap={12}
      interval="preserveStartEnd"
    />
  );
}

function yAxis(fmtDigits = 0, domain?: [number | string, number | string]) {
  return (
    <YAxis
      width={Y_WIDTH}
      tick={AXIS_TICK}
      axisLine={false}
      tickLine={false}
      tickFormatter={(v: number) => fmt(v, fmtDigits)}
      domain={domain ?? ['auto', 'auto']}
      tickCount={3}
    />
  );
}

interface LabelRenderProps {
  x?: number | string;
  y?: number | string;
  index?: number;
}

/** Label langsung di ujung garis (titik terakhir yang bernilai); `dy` menghindari tabrakan antar label. */
function endLabel(text: string, fill: string, at: number, dy = 0) {
  return function EndLabel({ x, y, index }: LabelRenderProps) {
    if (index !== at || x === undefined || y === undefined) return null;
    return (
      <text x={Number(x) + 8} y={Number(y) + dy} dy="0.35em" fontSize={12} fontFamily="var(--font-mono)" fill={fill}>
        {text}
      </text>
    );
  };
}

/** Geser label yang terlalu rapat (< 14 px) agar tetap terbaca. Mengembalikan offset px per seri. */
function spread(values: number[], domain: [number, number], heightPx: number): number[] {
  const span = Math.max(domain[1] - domain[0], 1e-9);
  const ys = values.map((v) => heightPx * (1 - (v - domain[0]) / span));
  const order = ys.map((y, i) => ({ y, i })).sort((a, b) => a.y - b.y);
  const out = new Array<number>(values.length).fill(0);
  let prev = -Infinity;
  for (const o of order) {
    const y = Math.max(o.y, prev + 14);
    out[o.i] = y - o.y;
    prev = y;
  }
  return out;
}

function lastIndex(rows: Row[], get: (r: Row) => number | null): number {
  for (let i = rows.length - 1; i >= 0; i--) if (get(rows[i] as Row) !== null) return i;
  return rows.length - 1;
}

/**
 * Riwayat harian (06–18) dari `useDayProfile`, sebagai small multiples (satu sumbu per grafik; tanpa sumbu ganda).
 * Kuasi-tunak per jam: massa termal diabaikan; profil cuaca ilustratif.
 * Dirender langsung (tanpa penunda IntersectionObserver): data kecil, dan penundaan itulah yang dulu
 * menyisakan area kosong ±400 px pada tangkapan layar / lompatan scroll.
 */
export function DayHistory() {
  const mode = useStore((s) => s.mode);
  const hotSource = useStore((s) => s.inputs.hotSourceAvailable);
  const heatLoad = useStore((s) => s.inputs.heatLoadAvailable);
  const [scenario, setScenario] = useState<DayScenario>(mode === 'rainy' ? 'hujan' : 'cerah');
  const points = useLaggedDayProfile(scenario);

  const rows = useMemo<Row[]>(
    () =>
      points.map((p) => ({
        hour: p.hour,
        g: p.irradiance,
        rain: p.rainMmH,
        ambient: p.ambientC,
        cell: p.result.cellC,
        tIn: p.result.inletC,
        tOut: p.result.pumpOn ? p.result.outletC : null,
        q: p.result.qLiquidW,
        pe: p.result.electricalW,
        pump: p.result.pumpW,
        pumpOn: p.result.pumpOn,
      })),
    [points],
  );
  const totals = useMemo(() => summarizeDay(points), [points]);
  const anyRain = rows.some((r) => r.rain > 0);

  const tipG = useMemo(
    () =>
      makeTooltip(rows, [
        { label: 'Irradiansi G', get: (r) => r.g, digits: 0, unit: 'W/m²', swatch: COLOR.ink2 },
        { label: 'Hujan', get: (r) => r.rain, digits: 0, unit: 'mm/jam', swatch: COLOR.cool },
      ]),
    [rows],
  );
  const tipT = useMemo(
    () =>
      makeTooltip(rows, [
        { label: 'T sel', get: (r) => r.cell, digits: 1, unit: '°C', swatch: COLOR.ink },
        { label: 'T udara', get: (r) => r.ambient, digits: 1, unit: '°C', swatch: COLOR.loss },
        { label: 'T masuk', get: (r) => r.tIn, digits: 1, unit: '°C', swatch: COLOR.cool },
        { label: 'T keluar', get: (r) => r.tOut, digits: 1, unit: '°C', swatch: COLOR.heat },
      ]),
    [rows],
  );
  const tipQ = useMemo(
    () => makeTooltip(rows, [{ label: 'Q cairan (W_th)', get: (r) => r.q, digits: 0, unit: 'W', swatch: COLOR.heat, signed: true }]),
    [rows],
  );
  const tipP = useMemo(
    () =>
      makeTooltip(rows, [
        { label: 'Listrik PV (W_e)', get: (r) => r.pe, digits: 0, unit: 'W', swatch: COLOR.ink },
        { label: 'Pompa (W_e)', get: (r) => r.pump, digits: 1, unit: 'W', swatch: COLOR.loss },
      ]),
    [rows],
  );

  // Label langsung di ujung garis suhu (dengan penghindar tabrakan).
  const tempEnds = useMemo(() => {
    const defs = [
      { key: 'cell', text: 'T sel', fill: 'var(--color-ink)', get: (r: Row) => r.cell as number | null },
      { key: 'ambient', text: 'T udara', fill: 'var(--color-ink-3)', get: (r: Row) => r.ambient as number | null },
      { key: 'tIn', text: 'T masuk', fill: 'var(--color-cool-ink)', get: (r: Row) => r.tIn as number | null },
      { key: 'tOut', text: 'T keluar', fill: 'var(--color-heat-ink)', get: (r: Row) => r.tOut },
    ];
    const all = rows.flatMap((r) => defs.map((d) => d.get(r)).filter((v): v is number => v !== null));
    const lo = all.length ? Math.min(...all) : 0;
    const hi = all.length ? Math.max(...all) : 1;
    const ends = defs.map((d) => lastIndex(rows, d.get));
    const vals = defs.map((d, i) => (d.get(rows[ends[i] as number] as Row) as number | null) ?? lo);
    const dys = spread(vals, [lo, hi], H - 12);
    return Object.fromEntries(defs.map((d, i) => [d.key, endLabel(d.text, d.fill, ends[i] as number, dys[i])]));
  }, [rows]);

  const powerEnds = useMemo(() => {
    const hi = Math.max(1, ...rows.map((r) => Math.max(r.pe, r.pump)));
    const iPe = rows.length - 1;
    const dys = spread([rows[iPe]?.pe ?? 0, rows[iPe]?.pump ?? 0], [0, hi], H - 12);
    return {
      pe: endLabel('Listrik PV', 'var(--color-ink)', iPe, dys[0]),
      pump: endLabel('Pompa', 'var(--color-ink-2)', iPe, dys[1]),
    };
  }, [rows]);

  const daySummary = `Ringkasan hari ${scenario}: listrik PV ${fmt(totals.electricalKWh, 2)} kWh listrik, pompa ${fmt(totals.pumpKWh, 2)} kWh listrik, panas berguna ${fmt(totals.usefulHeatKWh, 2)} kWh termal, panas dibuang ${fmt(totals.heatRejectedKWh, 2)} kWh termal.`;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <SegmentedControl<DayScenario>
          ariaLabel="Skenario hari"
          size="sm"
          value={scenario}
          onChange={setScenario}
          options={[
            { value: 'cerah', label: 'Hari cerah', icon: <SunIcon size={16} />, dot: 'heat' },
            { value: 'hujan', label: 'Hari hujan', icon: <RainIcon size={16} />, dot: 'cool' },
          ]}
        />
        <p className="text-small text-ink-2">Kuasi-tunak per jam; mengabaikan massa termal; cuaca ilustratif.</p>
      </div>

      {scenario === 'hujan' && !hotSource ? (
        <p className="mt-4 max-w-[64ch] text-small text-ink-2" role="note">
          Masukan saat ini tidak punya sumber panas yang perlu didinginkan, jadi pembuangan panas tidak aktif pada hari hujan. Pilih preset <strong className="font-medium text-ink">Hujan</strong> untuk
          melihat pembuangan panas.
        </p>
      ) : null}
      {scenario === 'cerah' && !heatLoad ? (
        <p className="mt-4 max-w-[64ch] text-small text-ink-2" role="note">
          Masukan saat ini tidak punya beban panas, jadi panen panas tidak dihitung sebagai manfaat dan pompa mode otomatis tidak menyala.
        </p>
      ) : null}

      <div className="mt-6 space-y-6" role="group" aria-label={`Riwayat harian skenario ${scenario}. ${daySummary}`}>
        <div>
          <MiniHeader
            title="Irradiansi"
            unit="G (W/m²)"
            note={anyRain ? 'hujan: lihat tooltip atau tabel' : undefined}
          />
          <div style={{ height: H }}>
            <ResponsiveContainer width="100%" height="100%" initialDimension={INITIAL}>
              <AreaChart data={rows} syncId="day" margin={MARGIN}>
                {grid}
                {xAxis(false)}
                {yAxis(0, [0, 'auto'])}
                <Tooltip content={tipG} cursor={cursorLine} isAnimationActive={false} />
                <Area
                  dataKey="g"
                  stroke={COLOR.ink2}
                  strokeWidth={2}
                  fill={COLOR.loss}
                  fillOpacity={0.25}
                  isAnimationActive={false}
                  dot={false}
                  label={endLabel('G', 'var(--color-ink-2)', rows.length - 1)}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div>
          <MiniHeader title="Suhu" unit="(°C)" />
          <div style={{ height: H + 8 }}>
            <ResponsiveContainer width="100%" height="100%" initialDimension={{ ...INITIAL, height: H + 8 }}>
              <LineChart data={rows} syncId="day" margin={MARGIN}>
                {grid}
                {xAxis(false)}
                {yAxis(0)}
                <Tooltip content={tipT} cursor={cursorLine} isAnimationActive={false} />
                <Line dataKey="ambient" stroke={COLOR.loss} strokeWidth={2} strokeDasharray="2 4" dot={false} isAnimationActive={false} label={tempEnds.ambient} />
                <Line dataKey="tIn" stroke={COLOR.cool} strokeWidth={1.5} strokeDasharray="5 4" dot={false} isAnimationActive={false} label={tempEnds.tIn} />
                <Line
                  dataKey="tOut"
                  stroke={COLOR.heat}
                  strokeWidth={2}
                  dot={{ r: 2.5, fill: COLOR.heat, stroke: COLOR.surface, strokeWidth: 1 }}
                  connectNulls={false}
                  isAnimationActive={false}
                  label={tempEnds.tOut}
                />
                <Line dataKey="cell" stroke={COLOR.ink} strokeWidth={2} dot={false} isAnimationActive={false} label={tempEnds.cell} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div>
          <MiniHeader
            title="Panas ke cairan"
            unit="Q (W_th, bertanda)"
            note={
              <>
                <span className="text-heat-ink">↓ panen</span> · <span className="text-cool-ink">↑ buang</span> · garis = nol
              </>
            }
          />
          <div style={{ height: H }}>
            <ResponsiveContainer width="100%" height="100%" initialDimension={INITIAL}>
              <BarChart data={rows} syncId="day" margin={MARGIN} barCategoryGap="18%">
                {grid}
                {xAxis(false)}
                {yAxis(0)}
                <Tooltip content={tipQ} cursor={{ fill: 'var(--color-sunken)', fillOpacity: 0.7 }} isAnimationActive={false} />
                <ReferenceLine y={0} stroke="var(--color-ink-2)" strokeWidth={1} />
                <Bar dataKey="q" radius={2} isAnimationActive={false} minPointSize={1}>
                  {rows.map((r) => (
                    <Cell key={r.hour} fill={r.q >= 0 ? COLOR.heat : COLOR.cool} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <p className="mt-1 max-w-[64ch] text-small text-ink-2">
            Jam dengan pompa mati (mode otomatis menilai tidak sepadan) ditampilkan 0.
          </p>
        </div>

        <div>
          <MiniHeader title="Daya listrik" unit="(W_e)" />
          <div style={{ height: H + 24 }}>
            <ResponsiveContainer width="100%" height="100%" initialDimension={{ ...INITIAL, height: H + 24 }}>
              <LineChart data={rows} syncId="day" margin={MARGIN}>
                {grid}
                {xAxis(true)}
                {yAxis(0, [0, 'auto'])}
                <Tooltip content={tipP} cursor={cursorLine} isAnimationActive={false} />
                <Line dataKey="pe" stroke={COLOR.ink} strokeWidth={2} dot={false} isAnimationActive={false} label={powerEnds.pe} />
                <Line dataKey="pump" stroke={COLOR.loss} strokeWidth={2} strokeDasharray="5 3" dot={false} isAnimationActive={false} label={powerEnds.pump} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <p className="text-mono-label text-ink-3">Jam lokal</p>
        </div>
      </div>

      <p className="mt-8 text-label text-ink-2">Total satu hari</p>
      <div className="mt-2 grid grid-cols-2 gap-x-6 gap-y-6 sm:grid-cols-3 lg:grid-cols-5">
        <Readout label="Listrik PV" value={totals.electricalKWh} unit="kWh" digits={2} kind="electrical" size="sm" />
        <Readout label="Pompa" value={totals.pumpKWh} unit="kWh" digits={2} kind="electrical" size="sm" />
        <Readout label="Net listrik" value={totals.netElectricalKWh} unit="kWh" digits={2} kind="electrical" size="sm" />
        <Readout label="Panas berguna" value={totals.usefulHeatKWh} unit="kWh" digits={2} kind="thermal" size="sm" />
        <Readout label="Panas dibuang" value={totals.heatRejectedKWh} unit="kWh" digits={2} kind="thermal" size="sm" />
      </div>
      <p className="mt-2 max-w-[64ch] text-small text-ink-2">Setiap titik jam dihitung mewakili 1 jam. kWh termal dan kWh listrik tidak dijumlahkan.</p>

      <div className="mt-6">
        <Disclosure title="Lihat sebagai tabel" level={4}>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[34rem] border-collapse text-right text-body">
              <caption className="sr-only">Nilai per jam untuk skenario {scenario}</caption>
              <thead>
                <tr className="h-10 border-b border-line-strong text-label text-ink-2">
                  <th scope="col" className="pr-3 text-left font-medium">Jam</th>
                  <th scope="col" className="pr-3 font-medium">G (W/m²)</th>
                  <th scope="col" className="pr-3 font-medium">Hujan (mm/jam)</th>
                  <th scope="col" className="pr-3 font-medium">T udara (°C)</th>
                  <th scope="col" className="pr-3 font-medium">T sel (°C)</th>
                  <th scope="col" className="pr-3 font-medium">Q cairan (W<sub>th</sub>)</th>
                  <th scope="col" className="pr-3 font-medium">Listrik (W<sub>e</sub>)</th>
                  <th scope="col" className="font-medium">Pompa (W<sub>e</sub>)</th>
                </tr>
              </thead>
              <tbody className="num text-mono-s text-ink-2">
                {rows.map((r) => (
                  <tr key={r.hour} className="h-10 border-b border-line">
                    <th scope="row" className="pr-3 text-left font-normal text-ink">{hourTick(r.hour)}:00</th>
                    <td className="pr-3">{fmt(r.g, 0)}</td>
                    <td className="pr-3">{fmt(r.rain, 0)}</td>
                    <td className="pr-3">{fmt(r.ambient, 1)}</td>
                    <td className="pr-3">{fmt(r.cell, 1)}</td>
                    <td className="pr-3">{fmtSigned(r.q, 0)}</td>
                    <td className="pr-3">{fmt(r.pe, 0)}</td>
                    <td>{r.pumpOn ? fmt(r.pump, 1) : '0'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Disclosure>
      </div>
    </div>
  );
}
