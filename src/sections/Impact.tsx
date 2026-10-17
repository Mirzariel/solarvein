import { useState } from 'react';
import { ChartCard } from '../charts/ChartCard';
import { Waterfall } from '../charts/impact/Waterfall';
import { LABELS, type BaselineId } from '../sim/system';
import { useBaselines, useSystem, useYear } from '../state/systemSelectors';
import { Disclosure, Evidence, SectionHeader, SegmentedControl, formatId, type SegmentedOption } from '../ui';
import { BaselineTable } from './impact/BaselineTable';
import { EnergySummary } from './impact/EnergySummary';
import { HotelScaler, PresetSwitch } from './impact/HotelScaler';
import { Sensitivity } from './impact/Sensitivity';
import { B4Breakeven, Verdict } from './impact/Verdict';
import { tonSigned } from './impact/format';
import './impact/impact.css';

const BASELINES: readonly SegmentedOption<BaselineId>[] = (['B1', 'B2', 'B3', 'B4'] as const).map((id) => ({
  value: id,
  label: id,
  description: LABELS.baseline[id],
}));

/**
 * 06 Dampak. One focal point: the generated verdict above the net CO₂e waterfall of the chosen baseline (B2 by
 * default, the honest comparator). Below it, carbon and money side by side per baseline, energy kept in kWh_e and
 * kWh_th, the hotel scaler, and the sensitivity. Every number is read from the system hooks; no odometer.
 */
export default function Impact() {
  const data = useBaselines();
  const sys = useSystem();
  const year = useYear(sys.controller.strategy);
  const [pick, setPick] = useState<BaselineId>('B2');
  const ledger = data.ledgers[pick];

  return (
    <section id="dampak" aria-labelledby="dampak-judul" className="impact relative scroll-mt-14 overflow-x-clip bg-paper py-24 lg:py-32">
      <div className="page-wrap">
        <SectionHeader
          id="dampak-judul"
          index={{ n: '06', label: 'Dampak' }}
          title="Dampak bersih terhadap empat pembanding."
          lead="Semua angka di bagian ini: hasil simulasi. Karbon dan biaya dihitung terpisah, dan tidak selalu searah."
        />

        <div className="mt-10">
          <PresetSwitch />
        </div>

        <div className="mt-12 lg:mt-16">
          <Verdict text={data.verdict} />
        </div>

        <div className="mt-16 lg:mt-24">
          <ChartCard
            title="Aliran CO₂e per tahun"
            unit="kgCO₂e/tahun"
            subtitle={
              <>
                Dibanding {LABELS.baseline[pick]}. Sudah dikurangi emisi tertanam dan listrik pompa.
              </>
            }
            actions={
              <SegmentedControl<BaselineId> ariaLabel="Pembanding" options={BASELINES} value={pick} onChange={setPick} size="sm" />
            }
          >
            <div className="mb-6 flex flex-wrap items-baseline gap-x-4 gap-y-1">
              <span className="num text-readout-xl text-ink" aria-label={`Bersih ${tonSigned(ledger.netKgPerYear, 2)} ton CO₂e per tahun`}>
                {tonSigned(ledger.netKgPerYear, 2)}
              </span>
              <span className="num text-mono-s text-ink-3">t CO₂e/tahun bersih vs {pick}</span>
              <Evidence tag="simulasi" label />
            </div>
            <Waterfall ledger={ledger} baselineName={`${pick} (${LABELS.baseline[pick]})`} lifetimeYears={sys.carbon.lifetimeYears} />
          </ChartCard>
        </div>

        <div className="mt-16 lg:mt-24">
          <ChartCard title="Karbon dan uang, per pembanding" subtitle="Pilih baris untuk melihat alirannya di atas.">
            <BaselineTable data={data} selected={pick} onSelect={setPick} lifetimeYears={sys.carbon.lifetimeYears} />
            <div className="mt-10">
              <B4Breakeven breakEven={data.b4BreakEvenFraction} assumed={sys.carbon.condenserRecoveryFraction} />
            </div>
          </ChartCard>
        </div>

        <div className="mt-16 lg:mt-24">
          <ChartCard title="Energi per tahun" subtitle="Listrik dan panas dipisah; masing-masing dikalikan faktornya sendiri.">
            <EnergySummary year={year} data={data} />
          </ChartCard>
        </div>

        <div className="mt-16 lg:mt-24">
          <ChartCard
            title="Skala hotel"
            subtitle={
              <>
                Hotel ilustrasi di Bali, bukan data proyek. Ganti ukuran di atas untuk melihat apakah hasilnya berubah.
              </>
            }
          >
            <HotelScaler data={data} />
          </ChartCard>
        </div>

        <div className="mt-16 max-w-4xl lg:mt-24">
          <Disclosure title="Sensitivitas" hint="Emisi listrik 0,68–0,87 · COP 3–4">
            <Sensitivity />
          </Disclosure>
          <Disclosure title="Batas dan cara membaca" hint="Apa yang sudah dikurangi, apa yang bukan klaim">
            <ul className="m-0 list-none space-y-2.5 p-0">
              <li>Penghematan air panas bergantung pada pemanas yang digantikan: LPG, tahanan listrik, atau pompa kalor.</li>
              <li>
                Angka bersih sudah dikurangi listrik pompa dan pengendali, emisi tertanam, dan tidak memuat jalur desikan (hipotesis riset).
              </li>
              <li>Pembanding B2 atau B4 bisa lebih unggul; kalimat vonis dibuat dari angka, tanpa pemenang bawaan.</li>
              <li>
                Layanan hotel tidak bergantung pada matahari. Pemanas dan AC lama selalu menjadi cadangan; yang turun saat malam dan hujan panjang hanya penghematannya.
              </li>
              <li>
                Biaya, tarif, dan harga pasang memakai asumsi rekayasa (<span className="num">{formatId(sys.carbon.lifetimeYears, 0)}</span> tahun umur pakai); belum ada kutipan harga.
              </li>
            </ul>
          </Disclosure>
        </div>
      </div>
    </section>
  );
}
