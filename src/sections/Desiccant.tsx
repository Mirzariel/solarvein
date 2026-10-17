import { useMemo, useState } from 'react';
import { DESICCANT_STATUS, LABELS, type HeatUseValue, type RegenAirSource } from '../sim/system';
import { useSystemStore } from '../state/system';
import { useHeatUses } from '../state/systemSelectors';
import { Disclosure, Evidence, EvidenceDot, SectionHeader, SegmentedControl, Slider, formatId, formatWithUnit } from '../ui';
import { ChartCard } from '../charts/ChartCard';
import { useElementWidth } from '../charts/useElementWidth';
import { DesiccantChart, VerdictKey, verdictText } from '../charts/desiccant/DesiccantChart';
import { COP_RATIOS, ratioKey, sweepCondition, useDesiccantGrid, type CopRatio } from '../charts/desiccant/useDesiccantGrid';
import { SECTION } from './nav';
import { Ledger } from './desiccant/Ledger';
import { Val } from './day/units';
import './Desiccant.css';

const AIR_LABEL: Record<RegenAirSource, string> = { ambient: 'Udara luar', exhaust: 'Udara buangan hotel' };
const fmtRatio = (r: number) => formatId(r, 1);
const ratioText = (r: number | null | undefined) => (r ? formatId(r, 2) : '—');

/**
 * 05 — Jalur riset desikan. Visible: status, one falsifiable threshold sentence (from the computed break-even ratios)
 * and one chart. Everything else (controls, table, ledger, levers, value table, test plan, basis) is behind one
 * "Lihat perhitungan" disclosure. Nothing here is validated; the sweep is an upper bound (no PV penalty or pump power).
 */
export default function Desiccant() {
  const def = SECTION['desikan'];
  const regenC = useSystemStore((s) => s.desiccantRegenC);
  const regenAir = useSystemStore((s) => s.regenAir);
  const setView = useSystemStore((s) => s.setDesiccantView);
  const [ratio, setRatio] = useState<CopRatio>(1.5);
  const { grid, temps, sys } = useDesiccantGrid();
  const heatUses = useHeatUses();
  const [chartRef, width] = useElementWidth<HTMLDivElement>();

  const series = useMemo(() => ({ ambient: grid.ambient[ratioKey(ratio)] ?? [], exhaust: grid.exhaust[ratioKey(ratio)] ?? [] }), [grid, ratio]);

  const domain = useMemo(() => {
    const all: number[] = [0];
    for (const air of ['ambient', 'exhaust'] as const)
      for (const r of COP_RATIOS) for (const e of grid[air][ratioKey(r)] ?? []) if (e.operating) all.push(e.hvac.netSavingWe / 1000);
    return { yMin: Math.floor(Math.min(...all) - 0.2), yMax: Math.ceil(Math.max(...all) + 0.2) };
  }, [grid]);

  const idx = Math.max(0, temps.indexOf(regenC));
  const selected = series[regenAir][idx];
  const cond = sweepCondition(sys);
  const ambientAt = grid.ambient[ratioKey(1.5)]?.[idx];
  const exhaustAt = grid.exhaust[ratioKey(1.5)]?.[idx];
  const at2 = grid[regenAir][ratioKey(2.0)]?.[idx];

  return (
    <section id="desikan" aria-labelledby="desikan-judul" className="scroll-mt-14 py-24 lg:py-32">
      <div className="page-wrap">
        <SectionHeader
          id="desikan-judul"
          index={def?.n ? { n: def.n, label: def.label } : undefined}
          title="Desikan: hipotesis riset."
          lead="Desikan (bahan penyerap uap air) mengeringkan udara segar hotel; panas kolektor mengeringkannya kembali."
        />
        <p className="mt-4 inline-flex items-center gap-2 text-small text-ink">
          <EvidenceDot tag="hipotesis" />
          {DESICCANT_STATUS}
        </p>
        <p className="mt-4 max-w-[64ch] text-body text-ink">
          Desikan baru menghemat listrik bila rasio COP ≥ <span className="num">{ratioText(ambientAt?.breakEvenCopRatio)}</span> (udara luar) atau ≥{' '}
          <span className="num">{ratioText(exhaustAt?.breakEvenCopRatio)}</span> (udara buangan hotel) pada{' '}
          <span className="num">{formatWithUnit(regenC, '°C', 0)}</span>; fase 3 mengukurnya.
        </p>

        <div className="mt-10 max-w-5xl">
          <ChartCard
            title="Hemat listrik AC bersih"
            unit={
              <span className="inline-flex items-center gap-2">
                <Evidence tag="hipotesis" /> <span>kW<sub className="text-[0.7em]">e</sub></span>
              </span>
            }
            subtitle="Batas atas: tanpa penalti PV dan daya pompa."
            actions={
              <div className="flex flex-col items-start gap-1.5 sm:items-end">
                <span className="text-label text-ink-2">Rasio COP</span>
                <SegmentedControl
                  ariaLabel="Rasio COP pendingin lanjutan terhadap koil"
                  size="sm"
                  value={ratioKey(ratio)}
                  onChange={(v) => setRatio(Number(v) as CopRatio)}
                  options={COP_RATIOS.map((r) => ({
                    value: ratioKey(r),
                    label: fmtRatio(r),
                    description: `Pendingin lanjutan (after-cooler) ${fmtRatio(r)} kali lebih efisien daripada koil acuan`,
                  }))}
                />
              </div>
            }
          >
            <div ref={chartRef} className="min-w-0">
              {width > 0 ? (
                <div data-export="desiccant-chart">
                  <DesiccantChart
                    width={width}
                    series={series}
                    yMin={domain.yMin}
                    yMax={domain.yMax}
                    selectedC={regenC}
                    selectedAir={regenAir}
                    onSelect={(t) => setView({ regenC: t })}
                  />
                </div>
              ) : (
                <div style={{ height: 340 }} />
              )}
            </div>
            <div className="mt-4">
              <VerdictKey />
            </div>
          </ChartCard>
        </div>

        <div className="mt-8 max-w-5xl">
          <Disclosure title="Lihat perhitungan" hint="Titik terpilih, neraca, tuas riset, rencana uji">
            <div className="space-y-12 pt-2">
              <p className="text-small text-ink-2">
                Rasio COP = COP pendingin lanjutan (after-cooler, suhu penguapan tinggi) dibagi COP koil acuan. Dihitung pada{' '}
                {LABELS.scenario[cond.scenario].toLowerCase()} pukul {formatId(cond.hour, 0)}.00: udara luar{' '}
                <span className="num text-ink">{formatWithUnit(cond.ambientC, '°C', 1)}</span>, RH <span className="num text-ink">{formatWithUnit(cond.rh * 100, '%', 0)}</span>.
              </p>

              <div className="grid gap-x-10 gap-y-6 sm:grid-cols-2">
                <SegmentedControl
                  ariaLabel="Sumber udara regenerasi"
                  size="sm"
                  value={regenAir}
                  onChange={(v) => setView({ regenAir: v })}
                  options={(['ambient', 'exhaust'] as const).map((a) => ({ value: a, label: AIR_LABEL[a] }))}
                />
                <Slider
                  id="desikan-suhu"
                  label="Suhu regenerasi"
                  value={regenC}
                  min={temps[0] ?? 35}
                  max={temps[temps.length - 1] ?? 70}
                  step={5}
                  unit="°C"
                  onChange={(v) => setView({ regenC: v })}
                  density="compact"
                  marks={temps}
                />
              </div>

              <table className="w-full border-collapse text-left">
                <caption className="sr-only">Hemat listrik bersih dan putusan per suhu regenerasi</caption>
                <thead>
                  <tr className="text-label text-ink-2">
                    <th scope="col" className="pb-2 pr-3 font-medium">Suhu</th>
                    {(['ambient', 'exhaust'] as const).map((a) => (
                      <th key={a} scope="col" className="pb-2 pr-3 text-right font-medium">{AIR_LABEL[a]}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {temps.map((t, i) => (
                    <tr key={t} className={`border-t border-line ${t === regenC ? 'bg-sunken' : ''}`}>
                      <th scope="row" className="py-2 pr-3 font-normal">
                        <button type="button" onClick={() => setView({ regenC: t })} aria-pressed={t === regenC} className="num min-h-8 text-mono-s text-ink underline-offset-4 hover:underline">
                          {t} °C
                        </button>
                      </th>
                      {(['ambient', 'exhaust'] as const).map((a) => {
                        const e = series[a][i];
                        return (
                          <td key={a} className="py-2 pr-3 text-right">
                            {e ? (
                              <>
                                <span className="num text-mono-s text-ink">{e.operating ? formatId(e.hvac.netSavingWe / 1000, 2) : '—'}</span>
                                <span className="ml-2 text-small text-ink-2">{verdictText(e)}</span>
                              </>
                            ) : null}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>

              {selected ? <Ledger e={selected} ratio={ratio} airLabel={AIR_LABEL[regenAir]} /> : null}

              <section aria-labelledby="desikan-tuas">
                <h3 id="desikan-tuas" className="text-h3 text-ink">Tuas riset</h3>
                <ul className="m-0 mt-4 list-none p-0">
                  <li className="border-t border-line py-3 text-body text-ink-2">
                    <span className="mr-2 inline-block align-middle"><EvidenceDot tag="simulasi" /></span>
                    <span className="text-ink">Udara buangan hotel</span> sebagai udara regenerasi: rasio COP impas turun dari{' '}
                    <span className="num text-ink">{ratioText(ambientAt?.breakEvenCopRatio)}</span> (udara luar) ke{' '}
                    <span className="num text-ink">{ratioText(exhaustAt?.breakEvenCopRatio)}</span> pada {formatWithUnit(regenC, '°C', 0)}.
                  </li>
                  <li className="border-t border-line py-3 text-body text-ink-2">
                    <span className="mr-2 inline-block align-middle"><EvidenceDot tag="simulasi" /></span>
                    <span className="text-ink">Pendingin lanjutan suhu tinggi</span>: pada rasio 2,0 hemat bersih{' '}
                    <Val v={(at2?.hvac.netSavingWe ?? 0) / 1000} d={2} unit="kW" kind="e" signed /> di {formatWithUnit(regenC, '°C', 0)}.
                  </li>
                  <li className="border-t border-line py-3 text-body text-ink-2">
                    <span className="mr-2 inline-block align-middle"><EvidenceDot tag="simulasi" /></span>
                    <span className="text-ink">ΔP rendah</span>: kipas dua aliran memakai <Val v={(selected?.hvac.fanWe ?? 0) / 1000} d={2} unit="kW" kind="e" /> pada titik terpilih.
                  </li>
                  <li className="border-b border-t border-line py-3 text-body text-ink-2">
                    <span className="mr-2 inline-block align-middle"><EvidenceDot tag="hipotesis" /></span>
                    <span className="text-ink">Material komposit</span> (garam dalam matriks): belum ada isoterm tervalidasi, sehingga tanpa angka.
                  </li>
                </ul>
              </section>

              <HeatUses items={heatUses} />

              <div>
                <h3 className="text-h3 text-ink">Rencana uji fase 3</h3>
                <p className="mt-3 text-body text-ink-2">
                  Unggun uji dijalankan pada suhu regenerasi 40, 45, 50, 55, dan 60 °C, dengan udara luar dan udara buangan hotel. Yang diukur: laju uap yang disingkirkan,
                  ΔP kedua aliran, suhu udara keluar, serta listrik tiap komponen, sama dengan suku-suku neraca di atas. Hasilnya menguji atau menggugurkan hipotesis ini.
                </p>
              </div>

              <p className="text-small text-ink-2">
                Isoterm silika-gel RD (Pesaran &amp; Mills, 1987) dengan geseran suhu berupa asumsi. Penyerapan hampir isentalpi, sehingga udara kering keluar lebih panas dan
                uap yang dibuang saja bukan penghematan. Hemat bersih = koil acuan − (pendingin lanjutan + koil sisa + kipas + pompa + penalti PV). Massa unggun{' '}
                <span className="num text-ink">{formatId(sys.desiccant.bedMassKg, 0)}</span> kg, siklus <span className="num text-ink">{formatId(sys.desiccant.cycleMin, 0)}</span> menit,
                efektivitas siklus <span className="num text-ink">{formatId(sys.desiccant.cycleEffectiveness, 2)}</span> (asumsi), udara segar{' '}
                <span className="num text-ink">{formatId(sys.hotel.freshAirKgS, 1)}</span> kg/s, titik embun suplai <span className="num text-ink">{formatId(sys.hotel.supplyDewPointC, 0)}</span> °C.
              </p>
            </div>
          </Disclosure>
        </div>
      </div>
    </section>
  );
}

/** Value of 1 kWh_th in each use (kgCO2e avoided). Dashed outline marks the hypothesis. */
function HeatUses({ items }: { items: HeatUseValue[] }) {
  const sorted = [...items].sort((a, b) => b.kgPerKWhTh - a.kgPerKWhTh);
  const max = Math.max(1e-9, ...sorted.map((i) => i.kgPerKWhTh));
  return (
    <section aria-labelledby="desikan-nilai">
      <h3 id="desikan-nilai" className="text-h3 text-ink">
        Nilai satu kWh<sub className="text-[0.6em]">th</sub> panas
      </h3>
      <p className="mt-1 text-small text-ink-2">kgCO₂e yang dihindari per kWh<sub className="text-[0.7em]">th</sub>, menurut pemakaiannya.</p>
      <ul className="m-0 mt-4 list-none p-0">
        {sorted.map((u) => (
          <li key={u.use} className="border-t border-line py-2.5 last:border-b">
            <div className="flex items-baseline justify-between gap-4">
              <span className="inline-flex min-w-0 items-center gap-2 text-small text-ink-2">
                <Evidence tag={u.tag} />
                <span className="text-ink">{u.label}</span>
              </span>
              <span className="num shrink-0 text-mono-s text-ink">{formatId(u.kgPerKWhTh, 3)}</span>
            </div>
            <span aria-hidden="true" className="mt-2 block h-1.5">
              <span
                className={`block ${u.use === 'desiccant' ? 'h-0 border-t-2 border-dashed border-ink-2' : 'h-full rounded-[2px] bg-heat-mark'}`}
                style={{ width: `max(8px, ${(u.kgPerKWhTh / max) * 100}%)` }}
              />
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
