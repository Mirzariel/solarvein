import { useMemo, useRef } from 'react';
import { LABELS, type DayScenarioId } from '../sim/system';
import { useSystemStore } from '../state/system';
import { useDay, useStep, useSystem, useYear } from '../state/systemSelectors';
import { Button, Disclosure, Evidence, Readout, ResetIcon, SectionHeader, SegmentedControl, formatId } from '../ui';
import { SECTION } from './nav';
import { useElementWidth } from '../charts/useElementWidth';
import { DayPlayhead, DayTracks, chartSummary, layoutTracks, type DayDomains } from '../charts/day/DayChart';
import { useDayModel } from '../charts/day/dayModel';
import { Scrubber } from './day/Scrubber';
import { StepReadout } from './day/StepReadout';
import { RainPanel } from './day/RainPanel';
import { Strategies } from './day/Strategies';
import { useEntrySweep } from './day/useEntrySweep';
import './DayAtHotel.css';

const SCENARIO_CHIPS: readonly DayScenarioId[] = ['terik', 'berawan', 'hujan'];
const ceilTo = (v: number, q: number): number => Math.max(q, Math.ceil(v / q - 1e-9) * q);

/**
 * 04 — Sehari di hotel. A sticky 24 h scrubber drives plain-SVG small multiples (mode bands, irradiance, DHW supply,
 * tank fill, PV) and a readout of the step under the playhead. Everything is a lookup into the cached day; the
 * only motion is one 06 → 24 h sweep on first entry. Below: the 3-rainy-days panel, three strategies and the area sweep.
 */
export default function DayAtHotel() {
  const def = SECTION['sehari'];
  const scenario = useSystemStore((s) => s.scenario);
  const dayView = useSystemStore((s) => s.dayView);
  const setDayView = useSystemStore((s) => s.setDayView);
  const setScenario = useSystemStore((s) => s.setScenario);

  const day = useDay();
  const clearDay = useDay('terik');
  const model = useDayModel(day);
  const clearModel = useDayModel(clearDay);
  const step = useStep();
  const hour = useSystemStore((s) => s.hour);
  const year = useYear();
  const sys = useSystem();

  const domains = useMemo<DayDomains>(
    () => ({ allocMaxKW: ceilTo(clearModel.maxDemandKW, 5), pvMaxKW: ceilTo(clearModel.maxPvKW, 2.5) }),
    [clearModel],
  );

  const block = useRef<HTMLDivElement>(null);
  const [colRef, width] = useElementWidth<HTMLDivElement>();
  const { replay, running, available } = useEntrySweep(block);

  const layoutH = width > 0 ? layoutTracks(width, model.tMax > 24).height : 560;
  const t = day.totals;

  return (
    <section id="sehari" aria-labelledby="sehari-judul" className="scroll-mt-14 py-24 lg:py-32">
      <div className="page-wrap">
        <SectionHeader
          id="sehari-judul"
          index={def?.n ? { n: def.n, label: def.label } : undefined}
          title="Ke mana panas pergi sepanjang hari."
          lead="Geser jam: air panas datang langsung dari kolektor, dari tangki, atau dari pemanas cadangan."
        />
        <p className="mt-4 inline-flex items-center gap-2 text-small text-ink-2">
          <Evidence tag="simulasi" label />
          <span>Semua angka di bagian ini: hasil simulasi.</span>
        </p>

        <div className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-3">
          <SegmentedControl
            ariaLabel="Rentang waktu"
            size="sm"
            value={dayView}
            onChange={(v) => setDayView(v)}
            options={[
              { value: '24h', label: '24 jam' },
              { value: '72h', label: '3 hari hujan' },
            ]}
          />
          <SegmentedControl
            ariaLabel="Jenis hari"
            size="sm"
            value={dayView === '72h' ? 'terik' : (scenario as DayScenarioId)}
            noSelection={dayView === '72h'}
            onChange={(v) => {
              if (dayView === '72h') setDayView('24h');
              setScenario(v);
            }}
            options={SCENARIO_CHIPS.map((s) => ({ value: s, label: LABELS.scenario[s] }))}
          />
          {available ? (
            <Button variant="ghost" size="sm" icon={<ResetIcon size={14} />} onClick={replay} disabled={dayView !== '24h' || running} className="ml-auto">
              Putar ulang
            </Button>
          ) : null}
        </div>

        <div ref={block} className="grid-12 mt-8 gap-y-10">
          <div ref={colRef} className="col-span-12 min-w-0 lg:col-span-8">
            <div className="sticky top-14 z-20 border-b border-line bg-paper">
              {width > 0 ? <Scrubber model={model} width={width} /> : <div className="h-14" />}
            </div>

            <figure
              data-export="day-chart"
              role="img"
              aria-label={chartSummary(model, LABELS.scenario[day.scenario])}
              className="relative m-0 mt-4"
              style={{ minHeight: layoutH }}
            >
              {width > 0 ? (
                <>
                  <DayTracks model={model} width={width} domains={domains} />
                  <DayPlayhead day={day} model={model} width={width} domains={domains} />
                </>
              ) : null}
            </figure>

            <p className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-small text-ink-2" aria-hidden="true">
              <span className="inline-flex items-center gap-2">
                <span className="block size-2.5 rounded-[2px] bg-heat-mark" />
                langsung dari kolektor
              </span>
              <span className="inline-flex items-center gap-2">
                <span className="block size-2.5 rounded-[2px] border border-heat-mark bg-heat-mark/40" />
                dari tangki
              </span>
              <span className="inline-flex items-center gap-2">
                <span className="block size-2.5 rounded-[2px] bg-loss" />
                cadangan pemanas
              </span>
            </p>

            <dl className="mt-8 grid grid-cols-2 gap-x-6 gap-y-5 sm:grid-cols-4">
              <Readout label="Fraksi surya air panas" value={t.solarFraction * 100} unit="%" digits={0} size="md" />
              <Readout label="Surya ke air panas" value={t.dhwSolarKWhTh} unit="kWh" kind="thermal" digits={0} size="md" />
              <Readout label="Cadangan pemanas" value={t.dhwBackupKWhTh} unit="kWh" kind="thermal" digits={0} size="md" />
              <Readout label="Listrik PV" value={t.pvKWhE} unit="kWh" kind="electrical" digits={0} size="md" />
            </dl>
            <p className="mt-3 max-w-[64ch] text-small text-ink-2">
              {LABELS.scenario[day.scenario]}, total {model.tMax} jam. Kebutuhan air panas tak terpenuhi:{' '}
              <span className="num text-ink">{formatId(t.unmetKWhTh, 0)}</span> kWh<sub className="text-[0.7em]">th</sub>; pemanas dan AC lama selalu siap.
            </p>

            <Disclosure title="Dasar hitung" hint="Hotel, panel, tangki, bobot hari" className="mt-8">
              <p>
                {sys.hotel.label}; <span className="num text-ink">{formatId(sys.array.modules * sys.array.module.areaM2, 0)}</span> m² PV/T, tangki{' '}
                <span className="num text-ink">{formatId(sys.tank.volumeL, 0)}</span> L. Angka setahun memakai <span className="num text-ink">{formatId(year.weights.reduce((a, w) => a + w.days, 0), 0)}</span> hari menurut jenis hari:{' '}
                {year.weights.map((w, i) => (
                  <span key={w.scenario}>
                    {i > 0 ? ', ' : ''}
                    {LABELS.scenario[w.scenario].toLowerCase()} <span className="num text-ink">{formatId(w.days, 0)}</span>
                  </span>
                ))}
                . Langkah waktu {formatId(day.dtH * 60, 0)} menit; neraca energi tangki tertutup dalam{' '}
                <span className="num text-ink">{formatId(Math.abs(day.energyClosureErrorKWh), 2)}</span> kWh<sub className="text-[0.7em]">th</sub>. Mode A/B/C dihitung dari
                kondisi, bukan dari jam.
              </p>
            </Disclosure>
          </div>

          <aside className="col-span-12 min-w-0 self-start lg:sticky lg:top-[88px] lg:col-span-4" aria-label="Keadaan pada jam terpilih">
            <StepReadout step={step} model={model} hour={hour} />
          </aside>
        </div>

        <RainPanel />
        <Strategies />
      </div>
    </section>
  );
}
