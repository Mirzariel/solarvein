import { useMemo, useState } from 'react';
import { useInView } from '../hooks';
import { LABELS, type BaselineId } from '../sim/system';
import { useDay } from '../state/systemSelectors';
import { useSystemStore } from '../state/system';
import { Disclosure, Readout, formatId } from '../ui';
import { FlowChart } from '../charts/lab/FlowChart';
import { dayFlows } from '../charts/lab/flowModel';
import { DayChart, TemperatureChart } from '../charts/lab/LabCharts';
import { Tabs, type TabSpec } from './lab/Tabs';
import { U } from './lab/units';
import { useIdleMemo, useSettledView } from './lab/useSettledView';

type TabId = 'aliran' | 'suhu' | 'harian';
const TABS: readonly TabSpec<TabId>[] = [
  { id: 'aliran', label: 'Aliran energi' },
  { id: 'suhu', label: 'Suhu' },
  { id: 'harian', label: 'Satu hari' },
];

const BASELINES: BaselineId[] = ['B1', 'B2', 'B3', 'B4'];

/** Hasil satu hari: dari DayResult yang sama dengan skema (kWh termal dan listrik selalu terpisah). */
function DayReadouts() {
  const day = useDay();
  const t = day.totals;
  const hours = day.steps.length * day.dtH;
  return (
    <div className="grid grid-cols-2 gap-x-6 gap-y-6 sm:grid-cols-3 xl:grid-cols-5">
      <Readout label="Bagian kebutuhan air panas dari surya" value={t.solarFraction * 100} unit="%" kind="neutral" size="md" digits={0} />
      <Readout label="Panas surya ke air panas" value={t.dhwSolarKWhTh} unit="kWh" kind="thermal" size="md" digits={0} sublabel={`dari ${formatId(t.dhwDemandKWhTh, 0)} kWh kebutuhan`} />
      <Readout label="Pemanas cadangan" value={t.dhwBackupKWhTh} unit="kWh" kind="thermal" size="md" digits={0} />
      <Readout label="Listrik PV" value={t.pvKWhE} unit="kWh" kind="electrical" size="md" digits={0} sublabel={`${formatId(hours, 0)} jam`} />
      <Readout label="Kebutuhan tidak terpenuhi" value={t.unmetKWhTh} unit="kWh" kind="thermal" size="md" digits={1} sublabel="pemanas siaga" />
    </div>
  );
}

/** Hasil tahunan (tier berat, ditunda): bagian surya dan CO2e bersih terhadap empat pembanding. */
function YearReadouts() {
  // tier berat: hanya dihitung bila terlihat, setelah geseran berhenti, dan satu per satu (waktu senggang)
  const [ref, inView] = useInView<HTMLDivElement>({ rootMargin: '300px' });
  const { view, pending } = useSettledView(280, inView);
  const strategy = useSystemStore((s) => s.strategy);
  const year = useIdleMemo(() => view.year(strategy), [view, strategy]);
  const base = useIdleMemo(() => view.baselines(), [view, year]);
  const calculating = pending || year === undefined || base === undefined;
  return (
    <div ref={ref} className={calculating ? 'opacity-60 transition-opacity' : 'transition-opacity'} aria-busy={calculating}>
      <div className="grid grid-cols-2 gap-x-6 gap-y-6 sm:grid-cols-3 xl:grid-cols-5">
        <Readout label="Bagian air panas dari surya, setahun" value={(year?.totals.solarFraction ?? NaN) * 100} unit="%" kind="neutral" size="md" digits={0} />
        {BASELINES.map((b) => (
          <Readout
            key={b}
            label={`CO₂e bersih dihindari terhadap ${b}`}
            value={(base?.ledgers[b].netKgPerYear ?? NaN) / 1000}
            unit="t/tahun"
            kind="neutral"
            size="md"
            digits={1}
            signed
            sublabel={LABELS.baseline[b]}
          />
        ))}
      </div>
      <p className="mt-4 text-small text-ink-2" role="status" aria-live="polite">
        {calculating ? 'Menghitung ulang angka tahunan…' : ''}
      </p>
      <Disclosure title="Kalimat putusan terhadap pembanding" hint="Dibuat dari angka di atas" level={4} className="mt-2 max-w-3xl">
        <U>{base?.verdict ?? ''}</U>
      </Disclosure>
    </div>
  );
}

/**
 * Keluaran Lab: angka satu hari (mengikuti skenario), angka tahunan (ditunda agar geseran tetap mulus), lalu tiga
 * tampilan dalam tab: aliran energi, suhu, satu hari.
 */
export default function Instrumentation() {
  const [tab, setTab] = useState<TabId>('aliran');
  return (
    <div>
      <h3 className="sr-only">Pembacaan dan grafik</h3>
      <p className="mb-6 text-small text-ink-2">Semua angka di bagian ini: hasil simulasi.</p>
      <DayReadouts />
      <div className="mt-10">
        <YearReadouts />
      </div>
      <div className="mt-14">
        <Tabs tabs={TABS} value={tab} onChange={setTab} ariaLabel="Grafik keluaran">
          {tab === 'aliran' ? <FlowTab /> : null}
          {tab === 'suhu' ? <TemperatureChart /> : null}
          {tab === 'harian' ? <DayChart /> : null}
        </Tabs>
      </div>
    </div>
  );
}

function FlowTab() {
  const day = useDay();
  const sys = useSystemStore((s) => s.sys);
  const flows = useMemo(() => dayFlows(sys, day), [sys, day]);
  return (
    <FlowChart
      flows={flows}
      caption={
        <>
          {formatId(flows.hours, 0)} jam, {LABELS.scenario[day.scenario].toLowerCase()}. Lebar pita sebanding energi pada satu skala. kWh<sub className="text-[0.7em]">e</sub> dan kWh<sub className="text-[0.7em]">th</sub> ditandai
          terpisah dan tidak dijumlahkan; sisa radiasi adalah selisih, bukan hasil ukur.
        </>
      }
    />
  );
}
