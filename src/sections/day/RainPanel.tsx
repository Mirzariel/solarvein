import { useDeferredValue, useMemo, type ReactNode } from 'react';
import { getSystemView, type DayResult, type HeaterType } from '../../sim/system';
import { useSystemStore } from '../../state/system';
import { useDay, useSystem } from '../../state/systemSelectors';
import { Evidence, formatId, formatWithUnit } from '../../ui';
import { Val } from './units';

const HEATER_LABEL: Record<HeaterType, string> = {
  lpg: 'LPG',
  'electric-resistance': 'resistansi listrik',
  'heat-pump': 'pompa kalor',
};

/** Tank volume factor for the "tangki lebih besar" option; the loss coefficient scales with the shell area ∝ V^(2/3). */
const TANK_FACTOR = 2;

interface RainFacts {
  rain: DayResult;
  clear: DayResult;
  coilAvgKWe: number;
  desiccantIdle: boolean;
  bigTank: { fraction: number; backupKWhTh: number };
  heatPump: { condenserKWhTh: number; workKWhE: number; cop: number };
}

/** All numbers of the "Saat hujan panjang & malam" panel: the 72 h rain scenario plus two optional variants. */
function useRainFacts(): RainFacts {
  const sys = useDeferredValue(useSystem());
  const strategy = useSystemStore((s) => s.strategy);
  const rain = useDay('hujan-3-hari');
  const clear = useDay('terik');
  return useMemo(() => {
    const coilAvgKWe = rain.steps.reduce((a, s) => a + s.hvac.refWe, 0) / Math.max(1, rain.steps.length) / 1000;

    const desiccantIdle = rain.steps.every((s) => !s.desiccant.available && s.desiccant.regenW < 1);
    const big = structuredClone(sys);
    big.tank.volumeL *= TANK_FACTOR;
    big.tank.uaWPerK *= TANK_FACTOR ** (2 / 3);
    const bigDay = getSystemView(big).day('hujan-3-hari', strategy);

    const hp = structuredClone(sys);
    hp.heatPumpSource.enabled = true;
    const hpDay = getSystemView(hp).day('hujan-3-hari', strategy);
    const baseDay = getSystemView({ ...structuredClone(sys), heatPumpSource: { ...sys.heatPumpSource, enabled: false } }).day('hujan-3-hari', strategy);
    const cond = Math.max(0, hpDay.totals.dhwSolarKWhTh - baseDay.totals.dhwSolarKWhTh);
    const work = hpDay.totals.heatPumpWorkKWhE ?? 0;

    return {
      rain,
      clear,
      coilAvgKWe,
      desiccantIdle,
      bigTank: { fraction: bigDay.totals.solarFraction, backupKWhTh: bigDay.totals.dhwBackupKWhTh },
      heatPump: { condenserKWhTh: cond, workKWhE: work, cop: work > 1e-9 ? cond / work : 0 },
    };
  }, [sys, strategy, rain, clear]);
}

function Line({ n, title, children }: { n: string; title: string; children: ReactNode }) {
  return (
    <li className="grid gap-x-6 gap-y-1 border-t border-line py-4 sm:grid-cols-[minmax(0,15rem)_1fr]">
      <p className="flex items-baseline gap-3 text-body font-medium text-ink">
        <span className="num text-mono-label text-ink-3">{n}</span>
        {title}
      </p>
      <div className="text-body text-ink-2">{children}</div>
    </li>
  );
}

/** Four lines, all computed from the 72 h rain scenario (service never depends on the sun; only the saving falls). */
export function RainPanel() {
  const sys = useSystem();
  const f = useRainFacts();
  const t = f.rain.totals;
  const clearFrac = f.clear.totals.solarFraction;
  const hpCopBase = sys.carbon.hpwhCop;

  return (
    <section aria-labelledby="sehari-hujan">
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
        <h3 id="sehari-hujan" className="text-h3 text-ink">
          Saat hujan panjang &amp; malam
        </h3>
      </div>
      <ol className="m-0 mt-5 list-none p-0">
        <Line n="1" title={`Air panas tetap ${formatId(sys.hotel.dhwSetpointC, 0)} °C`}>
          Pemanas cadangan ({HEATER_LABEL[sys.hotel.heater]}) menutup <Val v={t.dhwBackupKWhTh} d={0} unit="kWh" kind="th" /> dari kebutuhan{' '}
          <Val v={t.dhwDemandKWhTh} d={0} unit="kWh" kind="th" />; kebutuhan yang tidak terpenuhi <Val v={t.unmetKWhTh} d={0} unit="kWh" kind="th" />.
        </Line>
        <Line n="2" title="Pendingin udara">
          Koil AC tetap menangani udara lembap; beban listriknya rata-rata <Val v={f.coilAvgKWe} d={1} unit="kW" kind="e" />. {f.desiccantIdle ? 'Desikan tidak ikut bekerja.' : 'Desikan bekerja sebagian.'}
        </Line>
        <Line n="3" title="Kontribusi SolarVein turun">
          Fraksi surya air panas dari <span className="num text-ink">{formatWithUnit(clearFrac * 100, '%', 0)}</span> (hari terik) menjadi{' '}
          <span className="num text-ink">{formatWithUnit(t.solarFraction * 100, '%', 0)}</span> (termasuk simpanan awal tangki). Hotel tetap berfungsi seperti tanpa SolarVein; yang hilang hematnya, dan kerugian tangki <Val v={t.tankLossKWhTh} d={0} unit="kWh" kind="th" /> serta listrik pompa <Val v={t.parasiticKWhE} d={1} unit="kWh" kind="e" /> tetap terpakai.
        </Line>
        <Line n="4" title="Opsi">
          <p className="m-0">
            <span>
              <Evidence tag="simulasi" />{' '}
              Tangki {TANK_FACTOR}× lebih besar: fraksi surya <span className="num text-ink">{formatWithUnit(f.bigTank.fraction * 100, '%', 0)}</span>, cadangan{' '}
              <Val v={f.bigTank.backupKWhTh} d={0} unit="kWh" kind="th" />.
            </span>
          </p>
          <p className="m-0 mt-2">
            <span>
              <Evidence tag="hipotesis" />{' '}
              Pompa kalor bersumber PV/T (riset): kondensor memasok <Val v={f.heatPump.condenserKWhTh} d={0} unit="kWh" kind="th" /> dengan kerja{' '}
              <Val v={f.heatPump.workKWhE} d={0} unit="kWh" kind="e" />, COP <span className="num text-ink">{formatId(f.heatPump.cop, 1)}</span>
              {f.heatPump.cop > 0 && f.heatPump.cop < hpCopBase ? (
                <> (pompa kalor air panas biasa, B2: <span className="num text-ink">{formatId(hpCopBase, 1)}</span>).</>
              ) : (
                <>.</>
              )}
            </span>
          </p>
        </Line>
      </ol>
    </section>
  );
}


/** The one rain line that stays visible: how much the backup heater covers over 3 rainy days, and that service is unaffected. */
export function RainLine() {
  const rain = useDay('hujan-3-hari');
  const t = rain.totals;
  const backupPct = t.dhwDemandKWhTh > 0 ? (t.dhwBackupKWhTh / t.dhwDemandKWhTh) * 100 : 0;
  const servedPct = t.dhwDemandKWhTh > 0 ? (1 - t.unmetKWhTh / t.dhwDemandKWhTh) * 100 : 100;
  return (
    <p className="m-0 max-w-[64ch] text-body text-ink">
      3 hari hujan: pemanas cadangan menutup <span className="num">{formatWithUnit(backupPct, '%', 0)}</span>; layanan tetap{' '}
      <span className="num">{formatWithUnit(servedPct, '%', 0)}</span>.
    </p>
  );
}
