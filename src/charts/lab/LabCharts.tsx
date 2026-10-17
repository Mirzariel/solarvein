import { useMemo } from 'react';
import { modeBands, LABELS, type DayResult } from '../../sim/system';
import { useDay } from '../../state/systemSelectors';
import { useSystemStore } from '../../state/system';
import { cx } from '../../ui';
import { COLOR } from '../theme';
import { useElementWidth } from '../useElementWidth';
import { TimePanel, type TSeries } from './TimeChart';

/** Dua tampilan jam demi jam dari DayResult yang sama dengan skematik: suhu, dan satu hari (kelipatan kecil). */

const useScrub = () => {
  const hour = useSystemStore((s) => s.hour);
  const setHour = useSystemStore((s) => s.setHour);
  return { hour, setHour };
};

function useTimeBase(day: DayResult) {
  return useMemo(() => {
    const ts = day.steps.map((s) => s.t);
    const t1 = day.steps.length > 0 ? ts[ts.length - 1]! + day.dtH / 2 : 24;
    return { ts, t0: 0, t1: Math.round(t1) };
  }, [day]);
}

function Legend({ items }: { items: { label: string; color: string; dashed?: boolean }[] }) {
  return (
    <ul className="m-0 flex list-none flex-wrap gap-x-5 gap-y-1 p-0 text-label text-ink-2">
      {items.map((i) => (
        <li key={i.label} className="flex items-center gap-2">
          <svg width="14" height="8" aria-hidden="true">
            <rect
              x="0.5"
              y="0.5"
              width="13"
              height="7"
              fill={i.dashed ? 'none' : i.color}
              fillOpacity={0.85}
              stroke={i.dashed ? i.color : 'none'}
              strokeDasharray={i.dashed ? '2 1.5' : undefined}
            />
          </svg>
          {i.label}
        </li>
      ))}
    </ul>
  );
}

/** Suhu sepanjang skenario: kolektor (masuk, keluar, sel) dan tangki + air panas (atas, bawah, keluar penukar). */
export function TemperatureChart() {
  const day = useDay();
  const { hour, setHour } = useScrub();
  const [ref, width] = useElementWidth<HTMLDivElement>();
  const base = useTimeBase(day);
  const setpoint = useSystemStore((s) => s.sys.hotel.dhwSetpointC);

  const { collector, store } = useMemo(() => {
    const st = day.steps;
    const collector: TSeries[] = [
      { id: 'out', label: 'Keluar', color: COLOR.heat, width: 2, values: st.map((s) => (s.router.pumpOn ? s.collector.outletC : null)) },
      { id: 'in', label: 'Masuk', color: COLOR.loss, width: 2.5, values: st.map((s) => s.collector.inletC) },
      { id: 'cell', label: 'Sel', color: COLOR.ink, width: 1, values: st.map((s) => s.collector.cellC) },
    ];
    const store: TSeries[] = [
      { id: 'top', label: 'Tangki atas', color: COLOR.heat, width: 2, values: st.map((s) => s.tank.topC) },
      { id: 'bot', label: 'Tangki bawah', color: COLOR.loss, width: 2.5, values: st.map((s) => s.tank.bottomC) },
      { id: 'pot', label: 'Air panas', color: COLOR.ink, width: 1, values: st.map((s) => s.dhw.potableOutC ?? null) },
    ];
    return { collector, store };
  }, [day]);

  const draws = useMemo(() => day.steps.some((s) => s.dhw.drawLph > 0), [day]);
  return (
    <div ref={ref} className="min-w-0">
      {width > 0 ? (
        <div className="space-y-6">
          <TimePanel
            title="Kolektor"
            unit="°C"
            {...base}
            series={collector}
            digits={0}
            width={width}
            height={170}
            gutter={width < 520 ? 96 : 124}
            cursor={hour}
            onScrub={setHour}
            desc="Suhu cairan masuk, cairan keluar (hanya saat pompa jalan) dan sel PV sepanjang skenario."
          />
          <TimePanel
            title="Tangki dan air panas"
            unit="°C"
            {...base}
            series={store}
            digits={0}
            width={width}
            height={170}
            gutter={width < 520 ? 96 : 124}
            cursor={hour}
            onScrub={setHour}
            showXAxis
            refLines={[{ y: setpoint, label: `suhu set ${setpoint} °C` }]}
            desc="Suhu simpul atas dan bawah tangki, dan air minum keluar dari rantai penukar panas sebelum pemanas yang ada."
          />
          <p className="m-0 max-w-[64ch] text-small text-ink-2">
            Garis suhu keluar putus saat pompa mati. Air panas = air minum keluar dari penukar panas surya, sebelum pemanas yang ada menaikkannya ke suhu set
            {draws ? '' : '; tidak ada pemakaian pada skenario ini'}.
          </p>
        </div>
      ) : null}
    </div>
  );
}

/** Satu hari: kelipatan kecil berbagi sumbu waktu; satuan listrik dan panas tidak pernah berbagi sumbu. */
export function DayChart({ className }: { className?: string }) {
  const day = useDay();
  const { hour, setHour } = useScrub();
  const [ref, width] = useElementWidth<HTMLDivElement>();
  const base = useTimeBase(day);

  const rows = useMemo(() => {
    const st = day.steps;
    const kW = (w: number) => w / 1000;
    const irr: TSeries[] = [{ id: 'g', label: 'G', color: COLOR.ink2, area: true, fillOpacity: 0.16, values: st.map((s) => s.climate.irradiance) }];
    const pv: TSeries[] = [{ id: 'pv', label: 'PV', color: COLOR.ink, area: true, fillOpacity: 0.14, values: st.map((s) => kW(s.collector.electricalW)) }];
    const heat: TSeries[] = [
      { id: 'dhw', label: 'Air panas', color: COLOR.heat, values: st.map((s) => kW(s.router.allocW.dhw)), fillOpacity: 0.9 },
      { id: 'tank', label: 'Tangki', color: COLOR.heat, values: st.map((s) => kW(s.router.allocW.tank)), fillOpacity: 0.45 },
      { id: 'des', label: 'Desikan', color: COLOR.heat, dashed: true, values: st.map((s) => kW(s.router.allocW.desiccant)) },
      { id: 'byp', label: 'Tidak dipakai', color: COLOR.loss, values: st.map((s) => kW(s.router.allocW.bypass)), fillOpacity: 0.8 },
    ];
    const dhw: TSeries[] = [
      { id: 'sol', label: 'Surya', color: COLOR.heat, area: true, fillOpacity: 0.55, width: 1, values: st.map((s) => kW(Math.max(0, s.dhw.demandW - s.dhw.backupW))) },
      { id: 'dem', label: 'Kebutuhan', color: COLOR.ink, width: 1.25, values: st.map((s) => kW(s.dhw.demandW)) },
    ];
    const soc: TSeries[] = [{ id: 'soc', label: 'Isi', color: COLOR.heat, area: true, fillOpacity: 0.2, width: 1.5, values: st.map((s) => s.tank.soc * 100) }];
    return { irr, pv, heat, dhw, soc, bands: modeBands(day) };
  }, [day]);

  const g = width < 520 ? 80 : 124;
  const common = { ...base, width, cursor: hour, onScrub: setHour, gutter: g };
  return (
    <div ref={ref} className={cx('min-w-0', className)}>
      {width > 0 ? (
        <div className="space-y-5">
          <div>
            <p className="m-0 mb-1 text-label text-ink-2">
              <span className="text-ink">Mode pengendali</span>{' '}
              <span className="text-ink-3">dihitung dari kondisi, bukan jam</span>
            </p>
            <TimePanel title="" unit="" {...common} series={[]} bands={rows.bands} height={30} desc={`Mode pengendali sepanjang skenario: ${LABELS.mode.A}, ${LABELS.mode.B}, ${LABELS.mode.C}.`} />
          </div>
          <TimePanel title="Irradiansi" unit="W/m²" {...common} series={rows.irr} digits={0} height={78} desc="Irradiansi pada bidang panel." />
          <TimePanel title="Listrik PV" unit={<>kW<sub className="text-[0.7em]">e</sub></>} {...common} series={rows.pv} digits={1} height={78} desc="Daya listrik PV larik, sudah dikali derating sistem." />
          <div>
            <TimePanel title="Panas ke cairan, menurut tujuan" unit={<>kW<sub className="text-[0.7em]">th</sub></>} {...common} series={rows.heat} stacked digits={1} height={96} desc="Daya panas ke cairan, ditumpuk menurut tujuan router." />
            <Legend
              items={[
                { label: 'Air panas langsung', color: COLOR.heat },
                { label: 'Tangki', color: 'var(--color-heat)' },
                { label: 'Desikan (hipotesis)', color: COLOR.heat, dashed: true },
                { label: 'Tidak dipakai (bypass)', color: COLOR.loss },
              ]}
            />
          </div>
          <TimePanel title="Air panas: kebutuhan dan bagian surya" unit={<>kW<sub className="text-[0.7em]">th</sub></>} {...common} series={rows.dhw} digits={1} height={78} desc="Kebutuhan air panas dan bagian yang dipenuhi panas surya." />
          <TimePanel title="Isi tangki" unit="%" {...common} series={rows.soc} yMin={0} yMax={100} digits={0} height={78} showXAxis desc="Keadaan isi tangki penyangga." />
        </div>
      ) : null}
    </div>
  );
}
