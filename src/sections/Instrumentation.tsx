import { Suspense, lazy, memo, useRef, useState } from 'react';
import { useInView } from '../hooks';
import { useLaggedSimResult } from '../state';
import { Readout, SegmentedControl, formatId } from '../ui';
import { EnergyFlow } from '../charts/EnergyFlow';
import { TemperatureProfile } from '../charts/TemperatureProfile';
import { We, Wth } from '../charts/ChartCard';
import { Tabs, type TabSpec } from './lab/Tabs';

const FlowRibbons = memo(EnergyFlow);
// The two recharts views load only when their tab is opened (recharts is ~115 kB gzip; the default view is SVG).
const FlowBars = memo(lazy(() => import('../charts/PowerDistribution').then((m) => ({ default: m.PowerDistribution }))));
const Profile = memo(TemperatureProfile);
const Day = memo(lazy(() => import('../charts/DayHistory').then((m) => ({ default: m.DayHistory }))));

function ChartLoading() {
  return (
    <div role="status" className="grid h-[320px] place-items-center rounded-[20px] bg-sunken/60 text-small text-ink-3">
      Memuat grafik
    </div>
  );
}

type TabId = 'aliran' | 'suhu' | 'harian';
type FlowView = 'pita' | 'batang';

const TABS: readonly TabSpec<TabId>[] = [
  { id: 'aliran', label: 'Aliran energi' },
  { id: 'suhu', label: 'Suhu depan ke belakang' },
  { id: 'harian', label: 'Satu hari' },
];
const FLOW_VIEWS = [
  { value: 'pita' as const, label: 'Pita' },
  { value: 'batang' as const, label: 'Batang' },
];

/**
 * Keluaran Lab: enam pembacaan L2 (W_e dan W_th sudah ada di strip L1 di samping skematik), lalu grafik dalam
 * tab (satu per satu, bukan gulir panjang). Tab Aliran energi punya tampilan Pita atau Batang (menggantikan kartu
 * Distribusi daya yang terpisah: besaran yang sama).
 */
export default function Instrumentation() {
  // Pembacaan dan grafik mengikuti salinan yang ditunda dan dibatasi (bukan jari): geseran slider tidak menunggu recharts.
  const live = useLaggedSimResult();
  const [ref, inView] = useInView<HTMLDivElement>({ rootMargin: '200px' });
  // Di luar layar, hasil dibekukan: grafik (memo) tidak dirender ulang.
  const frozen = useRef(live);
  if (inView) frozen.current = live;
  const r = frozen.current;
  const [tab, setTab] = useState<TabId>('aliran');
  const [view, setView] = useState<FlowView>('pita');

  const rainDelta = r.qLiquidNoRainW === undefined ? 0 : r.qLiquidW - r.qLiquidNoRainW;
  const showRain = r.pumpOn && r.inputs.rainMmH > 0 && r.qLiquidW < 0 && rainDelta < 0 && r.qLiquidNoRainW !== undefined;
  const rainShare = r.qLiquidW !== 0 ? Math.min(1, Math.abs(rainDelta) / Math.abs(r.qLiquidW)) : 0;

  const caption =
    tab === 'aliran' ? (
      view === 'pita' ? (
        <>Lebar pita sebanding daya; kiri sumber, kanan tujuan. <We /> dan <Wth /> ditandai terpisah.</>
      ) : (
        <>Ke mana daya panel pergi: listrik, cairan, rugi. <We /> dan <Wth /> ditandai terpisah.</>
      )
    ) : tab === 'suhu' ? (
      'Dari depan ke belakang; panah menunjukkan arah panas, dari yang lebih panas ke yang lebih dingin.'
    ) : (
      'Satu hari 06.00–18.00 dengan masukanmu sebagai dasar, jam demi jam.'
    );

  return (
    <div ref={ref}>
      <h3 className="sr-only">Pembacaan dan grafik</h3>
      <div className="grid grid-cols-2 gap-x-6 gap-y-6 sm:grid-cols-3 xl:grid-cols-6">
        <Readout label="Daya surya masuk" value={r.solarInputW} unit="W" kind="neutral" size="md" />
        <Readout label="Konsumsi pompa" value={r.pumpW} unit="W" kind="electrical" digits={1} size="md" />
        <Readout
          label="ΔT cairan"
          value={r.deltaFluidK}
          unit="K"
          kind="temperature"
          signed
          digits={1}
          size="md"
          positiveHint="memanas"
          negativeHint="mendingin"
          sublabel={r.pumpOn ? `${formatId(r.inletC, 1)} ke ${formatId(r.outletC, 1)} °C` : undefined}
        />
        <Readout
          label="Suhu sel PV"
          value={r.cellC}
          unit="°C"
          kind="temperature"
          digits={1}
          size="md"
          sublabel={`stagnasi ${formatId(r.stagnationC, 1)} °C`}
        />
        <Readout label="Net listrik" value={r.netElectricalW} unit="W" kind="electrical" digits={1} size="md" />
        <Readout
          label="Efektivitas penukar"
          value={r.coefficients.effectiveness * 100}
          unit="%"
          kind="neutral"
          size="md"
          sublabel={r.pumpOn ? `NTU ${formatId(r.coefficients.ntu, 2)}` : 'pompa mati'}
        />
      </div>

      {showRain ? (
        <p className="mt-6 max-w-[64ch] text-body text-ink-2">
          Hujan menyumbang <span className="tabular-nums text-ink">{formatId(Math.abs(rainDelta), 0)}</span> <Wth /> dari pembuangan (
          <span className="tabular-nums text-ink">{formatId(rainShare * 100, 0)}%</span>). Sisanya angin dan pendinginan ke langit.
        </p>
      ) : null}

      <div className="mt-12">
        <Tabs
          tabs={TABS}
          value={tab}
          onChange={setTab}
          ariaLabel="Grafik keluaran"
          actions={
            tab === 'aliran' ? (
              <SegmentedControl<FlowView> ariaLabel="Tampilan aliran energi" size="sm" className="pointer-coarse:h-14!" options={FLOW_VIEWS} value={view} onChange={setView} />
            ) : undefined
          }
        >
          <p className="mb-6 max-w-[64ch] text-small text-ink-2">{caption}</p>
          <Suspense fallback={<ChartLoading />}>
            {tab === 'aliran' ? view === 'pita' ? <FlowRibbons result={r} /> : <FlowBars result={r} /> : null}
            {tab === 'suhu' ? <Profile result={r} /> : null}
            {tab === 'harian' ? <Day /> : null}
          </Suspense>
        </Tabs>
      </div>
    </div>
  );
}
