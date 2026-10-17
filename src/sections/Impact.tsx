import { useDeferredValue, useState } from 'react';
import { ChartCard } from '../charts/ChartCard';
import { Waterfall } from '../charts/impact/Waterfall';
import { LABELS, type BaselineId } from '../sim/system';
import { useBaselines, useSystem, useYear } from '../state/systemSelectors';
import { Disclosure, Evidence, SectionIndex, SegmentedControl, cx, formatId, type SegmentedOption } from '../ui';
import { BaselineTable } from './impact/BaselineTable';
import { EnergySummary } from './impact/EnergySummary';
import { HotelScaler, PresetSwitch } from './impact/HotelScaler';
import { Sensitivity } from './impact/Sensitivity';
import { B4Breakeven, Verdict } from './impact/Verdict';
import { idrSigned, paybackCells, tonSigned } from './impact/format';
import './impact/impact.css';

const BASELINES: readonly SegmentedOption<BaselineId>[] = (['B1', 'B2', 'B3', 'B4'] as const).map((id) => ({
  value: id,
  label: id,
  description: LABELS.baseline[id],
}));

/** Disclosure bodies that hold tables: wider than the 64 ch prose box, never wider than the viewport. */
const WIDE = 'w-[min(64rem,calc(100vw-2rem))]';

/**
 * 06 Dampak. L1 is one dark beat: a single sentence and the net CO₂e of the chosen baseline as the hero number
 * (B2 by default, the strongest comparator), with the money result beside it so a carbon/money split is visible.
 * Below: the waterfall for that baseline; everything else is behind disclosures. All numbers come from the hooks.
 */
export default function Impact() {
  const data = useBaselines();
  const sys = useSystem();
  const year = useYear(sys.controller.strategy);
  const [pick, setPick] = useState<BaselineId>('B2');
  // The sensitivity grid runs 18 carbon recomputes: mount it only once someone opens it.
  const [sensOpened, setSensOpened] = useState(false);
  const ledger = data.ledgers[pick];
  const eco = data.economics[pick];
  const cells = paybackCells(eco.paybackYears);
  const stale = useDeferredValue(sys) !== sys;
  const standby = ledger.rows.find((r) => r.kind === 'standby');

  return (
    <section id="dampak" aria-labelledby="dampak-judul" className="impact relative scroll-mt-14 overflow-x-clip bg-paper">
      {/* the one dark beat of the back half */}
      <div data-dark-band className="bg-stage-0 text-stage-ink">
        <div className="page-wrap py-20 lg:py-28">
          <SectionIndex n="06" label="Dampak" inverse />
          <div className="grid-12 mt-8 items-end gap-y-12">
            <h2
              id="dampak-judul"
              className="col-span-12 max-w-[26ch] text-[28px] font-medium leading-[34px] tracking-[-0.02em] text-stage-ink sm:text-[36px] sm:leading-[42px] lg:col-span-7 lg:text-[44px] lg:leading-[50px]"
            >
              Pembanding terkuat (B2, B4) bisa menang; hasilnya ditampilkan apa adanya.
            </h2>
            <div className="col-span-12 lg:col-span-5">
              <p
                aria-live="polite"
                aria-label={`CO₂e bersih ${tonSigned(ledger.netKgPerYear, 2)} ton per tahun dibanding ${pick}`}
                className={cx('num m-0 text-number-xl text-stage-electric transition-opacity duration-200', stale && 'opacity-50')}
              >
                {tonSigned(ledger.netKgPerYear, 2)}
              </p>
              <p className="num m-0 mt-3 text-mono-s text-stage-ink-2">
                t CO₂e/tahun bersih dibanding {pick} <Evidence tag="simulasi" inverse label />
              </p>
              <p className="num m-0 mt-2 text-mono-s text-stage-ink-2">
                Biaya energi <span className="whitespace-nowrap text-stage-ink">{idrSigned(eco.annualSavingIdr)}</span>/tahun ·{' '}
                {cells.every((c) => c.years === null) ? 'tidak balik modal' : `balik modal ${cells[1]?.text ?? '—'} tahun`}
              </p>
            </div>
          </div>
          <div className="mt-12 flex flex-wrap items-center gap-x-5 gap-y-3 border-t border-stage-line pt-6">
            <span className="text-small text-stage-ink-2">Dibanding</span>
            <SegmentedControl<BaselineId> ariaLabel="Pembanding" options={BASELINES} value={pick} onChange={setPick} size="sm" tone="stage" />
            <span className="text-small text-stage-ink-2">{LABELS.baseline[pick]}</span>
          </div>
        </div>
      </div>

      <div className="page-wrap py-16 lg:py-24">
        <ChartCard title="Aliran CO₂e per tahun">
          <div className="mb-8">
            <PresetSwitch />
          </div>
          <div className={cx('transition-opacity duration-200', stale && 'opacity-50')}>
            <Waterfall ledger={ledger} baselineName={`${pick} (${LABELS.baseline[pick]})`} showLabels={false} />
          </div>
        </ChartCard>

        <div className="mt-12 lg:mt-16">
          <Disclosure title="Ringkasan per pembanding">
            <Verdict text={data.verdict} />
            <B4Breakeven breakEven={data.b4BreakEvenFraction} assumed={sys.carbon.condenserRecoveryFraction} />
          </Disclosure>
          <Disclosure title="Karbon dan biaya per pembanding">
            <div className={WIDE}>
              <BaselineTable data={data} selected={pick} onSelect={setPick} lifetimeYears={sys.carbon.lifetimeYears} />
            </div>
          </Disclosure>
          <Disclosure title="Energi per tahun">
            <div className={WIDE}>
              <EnergySummary year={year} data={data} />
            </div>
          </Disclosure>
          <Disclosure title="Skala hotel">
            <div className={WIDE}>
              <HotelScaler data={data} />
            </div>
          </Disclosure>
          <Disclosure title="Sensitivitas" onOpenChange={(o) => o && setSensOpened(true)}>
            {sensOpened ? <Sensitivity /> : null}
          </Disclosure>
          <Disclosure title="Batas dan cara membaca">
            <ul className="m-0 list-none space-y-2.5 p-0">
              <li>Penghematan air panas bergantung pada pemanas yang digantikan: LPG, tahanan listrik, atau pompa kalor.</li>
              <li>Angka bersih sudah dikurangi listrik pompa dan pengendali serta emisi tertanam, dan tidak memuat jalur desikan (hipotesis riset).</li>
              <li>
                Emisi tertanam dibagi umur pakai <span className="num">{formatId(sys.carbon.lifetimeYears, 0)}</span> tahun.
                {standby ? (
                  <>
                    {' '}
                    Rugi diam tangki <span className="num">{formatId(standby.energy?.kWhTh ?? 0, 0)}</span> kWh<sub>th</sub> sudah ada di dalam panas surya terpakai, jadi tidak dihitung dua kali.
                  </>
                ) : null}
              </li>
              <li>Pembanding B2 atau B4 bisa lebih unggul; kalimat vonis dibuat dari angka, tanpa pemenang bawaan.</li>
              <li>Layanan hotel tidak bergantung pada matahari: pemanas cadangan dan AC lama selalu siap; yang turun saat malam dan hujan panjang hanya penghematannya.</li>
              <li>Biaya, tarif, dan harga pasang memakai asumsi rekayasa; belum ada kutipan harga.</li>
            </ul>
          </Disclosure>
        </div>
      </div>
    </section>
  );
}
