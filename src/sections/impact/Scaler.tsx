import { useMemo } from 'react';
import { CARBON_HOURS_GUIDANCE } from '../../sim';
import {
  electricityVsConvKWh,
  energyUnit,
  impactPerRoof,
  lpgKgPerPanel,
  massUnit,
  niceDigits,
  roofsFromLog,
  scaleImpact,
  useStore,
  type ImpactAssumptions,
  type ImpactScenario,
} from '../../state';
import { RainIcon, SegmentedControl, SunIcon, Toggle, formatId, type SegmentedOption } from '../../ui';
import { SliderRow } from '../lab/SliderRow';
import { BigStat } from './BigStat';

const SCENARIOS: readonly SegmentedOption<ImpactScenario>[] = [
  { value: 'sunny', label: 'Cerah', icon: <SunIcon size={16} />, dot: 'heat', description: 'Siang tropis cerah, ada beban air panas' },
  { value: 'rainy', label: 'Hujan', icon: <RainIcon size={16} />, dot: 'cool', description: 'Hujan deras, ada loop proses hangat' },
];

const LOG_MARKS = [
  { value: 1, label: '10' },
  { value: 2, label: '100' },
  { value: 3, label: '1.000' },
  { value: 4 },
];

export interface ImpactState extends ImpactAssumptions {
  scenario: ImpactScenario;
  logRoofs: number;
  panels: number;
}

/** Gabungan asumsi dampak dari store (jam per skenario + faktor emisi bersama). */
export function useImpactState(): ImpactState {
  const scenario = useStore((s) => s.impactScenario);
  const logRoofs = useStore((s) => s.impactLogRoofs);
  const panels = useStore((s) => s.impactPanels);
  const loadFraction = useStore((s) => s.impactLoadFraction);
  const hours = useStore((s) => s.impactHours[s.impactScenario]);
  const c = useStore((s) => s.carbon);
  return {
    scenario,
    logRoofs,
    panels,
    loadFraction,
    gridKgPerKWh: c.gridKgPerKWh,
    fuelKgPerKWh: c.fuelKgPerKWh,
    hoursPerYear: hours,
    incrementalEmbodiedKg: c.incrementalEmbodiedKg ?? 180,
    coolingDisplacementModeled: c.coolingDisplacementModeled,
  };
}

/** Hasil per panel untuk keadaan saat ini (memo per asumsi). */
export function useImpactPer(a: ImpactState) {
  return useMemo(
    () => impactPerRoof(a.scenario, a),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [a.scenario, a.gridKgPerKWh, a.fuelKgPerKWh, a.hoursPerYear, a.incrementalEmbodiedKg, a.coolingDisplacementModeled, a.loadFraction],
  );
}

function Co2e({ children }: { children?: never }) {
  void children;
  return (
    <>
      CO<sub className="text-[0.7em]">2</sub>e
    </>
  );
}

/**
 * "Bayangkan N atap.": pemindai skala. Semua angka dari simulate() pada preset, dikali jam setara, panel per atap
 * dan jumlah atap. Perkiraan kasar, bukan prediksi.
 */
export function Scaler({ onOpenAssumptions }: { onOpenAssumptions: () => void }) {
  const a = useImpactState();
  const per = useImpactPer(a);
  const setScenario = useStore((s) => s.setImpactScenario);
  const setLog = useStore((s) => s.setImpactLogRoofs);
  const setPanels = useStore((s) => s.setImpactPanels);
  const setLoad = useStore((s) => s.setImpactLoadFraction);
  const setHours = useStore((s) => s.setImpactHours);
  const setCarbon = useStore((s) => s.setCarbon);

  const roofs = roofsFromLog(a.logRoofs);
  const total = scaleImpact(per, roofs, a.panels);
  const inp = per.dual.inputs;
  const hasSource = inp.hotSourceAvailable;
  const hasLoad = inp.heatLoadAvailable;
  const guide = a.scenario === 'sunny' ? CARBON_HOURS_GUIDANCE.sunny : CARBON_HOURS_GUIDANCE.rainyHeavy;
  const sunny = a.scenario === 'sunny';

  const e = energyUnit(total.kWhElectricNet);
  const th = energyUnit(total.kWhThermalUseful);
  const rej = energyUnit(total.kWhThermalRejected);
  const co = massUnit(total.incrementalKg);
  const e2 = energyUnit(electricityVsConvKWh(per) * total.panels);
  const negative = total.incrementalKg < 0;
  const lpg = lpgKgPerPanel(per, a.hoursPerYear);
  const perCo = Math.abs(per.incrementalKg);

  return (
    <div className="grid-12 gap-y-8">
      <div className="col-span-12">
        <h3 className="text-h3-lg text-ink">
          Bayangkan <span className="tabular-nums">{formatId(roofs, 0)}</span> atap.
        </h3>
        <p className="mt-2 text-body text-ink-2">Perkiraan kasar dari simulasi, bukan prediksi.</p>
      </div>

      {/* masukan */}
      <div className="col-span-12 space-y-4 lg:col-span-4">
        <SegmentedControl<ImpactScenario> ariaLabel="Skenario cuaca" options={SCENARIOS} value={a.scenario} onChange={setScenario} size="md" className="pointer-coarse:h-14!" />
        <SliderRow
          id="impact-roofs"
          density="default"
          label="Jumlah atap"
          unit="atap"
          value={a.logRoofs}
          min={0}
          max={5}
          step={0.01}
          marks={LOG_MARKS}
          format={(v) => formatId(roofsFromLog(v), 0)}
          editable={false}
          onChange={setLog}
          help="Skala logaritmik, 1 sampai 100.000 atap."
        />
        <div>
          <SliderRow
            id="impact-panels"
            label="Panel per atap"
            unit="panel"
            value={a.panels}
            min={1}
            max={20}
            step={1}
            defaultValue={4}
            onChange={setPanels}
            help={`Satu panel = ${formatId(inp.areaM2, 1)} m². Empat panel kira-kira satu atap rumah dengan pemanas air.`}
          />
        </div>
        <SliderRow
          id="impact-hours"
          label={`Jam setara per tahun pada ${formatId(inp.irradiance, 0)} W/m²`}
          unit="jam"
          value={a.hoursPerYear}
          min={50}
          max={2000}
          step={10}
          marks={[guide.min, guide.max]}
          defaultValue={guide.typical}
          onChange={(v) => setHours(a.scenario, v)}
          help={`Kondisi ${sunny ? 'cerah' : 'hujan deras'} ini dikali jumlah jam ini: penskalaan beban penuh, jadi cenderung batas atas, bukan prakiraan cuaca. Acuan ${formatId(guide.min, 0)}–${formatId(guide.max, 0)} jam${sunny ? ' untuk iklim tropis' : ''}.`}
        />
        {hasLoad ? (
          <SliderRow
            id="impact-load"
            label="Porsi jam dengan beban panas"
            unit="%"
            value={Math.round(a.loadFraction * 100)}
            min={0}
            max={100}
            step={5}
            marks={[25, 50, 100]}
            defaultValue={50}
            onChange={(v) => setLoad(v / 100)}
            help="Berapa persen dari jam setara itu ada yang benar-benar memakai air hangatnya. Rumah biasa sekitar 20 sampai 30 persen; hotel, kos, atau binatu bisa mendekati 100 persen."
          />
        ) : null}
        {hasSource ? (
          <Toggle
            id="impact-cooling"
            label="Hitung pendingin yang digantikan"
            description={`Dry cooler, COP ${formatId(inp.coolingCOP, 0)}. Tanpa ini, panas dibuang tidak dihitung sebagai penghematan.`}
            checked={a.coolingDisplacementModeled}
            onChange={(v) => setCarbon({ coolingDisplacementModeled: v })}
          />
        ) : null}
      </div>

      {/* hasil */}
      <div className="col-span-12 lg:col-span-8">
        <div className={`grid grid-cols-1 gap-x-8 gap-y-8 sm:grid-cols-2 ${hasLoad && hasSource ? '' : 'lg:grid-cols-3'}`}>
          {hasLoad ? (
            <BigStat
              label="Panas per tahun"
              value={th.value}
              digits={niceDigits(th.value)}
              unit={th.unit}
              unitTag="th"
              note={`Untuk pemanasan awal air (±${formatId(inp.inletC + per.dual.deltaFluidK, 0)} °C).`}
              
            />
          ) : null}
          {hasSource ? (
            <BigStat
              label="Panas dibuang per tahun"
              value={rej.value}
              digits={niceDigits(rej.value)}
              unit={rej.unit}
              unitTag="th"
              note="Dari loop proses hangat. Ini panas, bukan listrik yang dihemat."
              
            />
          ) : null}
          <BigStat
            label="Listrik per tahun"
            value={e.value}
            digits={niceDigits(e.value)}
            unit={e.unit}
            unitTag="e"
            note={`PV biasa sudah menghasilkan hampir semua listrik ini. ${e2.value < 0 ? `SolarVein justru ${formatId(Math.abs(e2.value), niceDigits(e2.value))} ${e2.unit} lebih sedikit: ada pompa dan jam tanpa beban panas.` : `SolarVein menambah ${formatId(e2.value, niceDigits(e2.value))} ${e2.unit}.`}`}
            
          />
          <BigStat
            label={
              <>
                <Co2e /> {negative ? 'lebih banyak' : 'lebih sedikit'} per tahun
              </>
            }
            value={Math.abs(co.value)}
            digits={niceDigits(co.value)}
            unit={co.unit}
            note={negative ? 'Pada skenario ini PV biasa lebih baik.' : hasLoad ? 'Dibanding PV biasa dan pemanas LPG. Hampir seluruhnya berasal dari LPG yang digantikan.' : 'Dibanding PV biasa.'}
            
          />
        </div>

        <div className="mt-8 space-y-2 border-t border-line pt-5 text-body text-ink-2">
          <p>
            Per panel: <span className="tabular-nums text-ink">{formatId(per.kWhElectricNet, 0)}</span> kWh listrik
            {hasLoad ? (
              <>
                , <span className="tabular-nums text-ink">{formatId(per.kWhThermalUseful, 0)}</span> kWh panas
              </>
            ) : null}
            , <span className="tabular-nums text-ink">{formatId(perCo, 0)}</span> kg <Co2e /> {negative ? 'lebih banyak' : 'lebih sedikit'} per tahun.
          </p>
          {hasLoad ? (
            <p>
              Panas itu ekuivalen dengan sekitar <span className="tabular-nums text-ink">{formatId(lpg, 0)}</span> kg LPG per panel per tahun.
            </p>
          ) : null}
          <p className="text-small">
            {sunny
              ? `Siang cerah (${formatId(inp.irradiance, 0)} W/m², udara ${formatId(inp.ambientC, 0)} °C), ${formatId(a.hoursPerYear, 0)} jam setara per tahun, ${formatId(a.loadFraction * 100, 0)}% jam dipakai untuk memanaskan air menggantikan LPG.`
              : `Hujan deras (${formatId(inp.irradiance, 0)} W/m², ${formatId(inp.rainMmH, 0)} mm/jam), ${formatId(a.hoursPerYear, 0)} jam setara per tahun, ${
                  a.coolingDisplacementModeled ? 'pendingin pengganti dihitung' : 'pendingin pengganti tidak dihitung'
                }.`}{' '}
            <button
              type="button"
              onClick={onOpenAssumptions}
              className="inline-flex min-h-8 items-center text-ink underline decoration-line-strong underline-offset-4 transition-ui hover:decoration-ink pointer-coarse:min-h-11"
            >
              Lihat asumsi dan batasnya
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
