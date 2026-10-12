import type { ReactNode } from 'react';
import { LPG_KWH_PER_KG, impactLedger, netRejectionBenefitW, presetPair, useStore } from '../../state';
import { MINUS, formatId } from '../../ui';
import { SliderRow } from '../lab/SliderRow';
import { useImpactPer, useImpactState } from './Scaler';

const f = (n: number, d = 0) => formatId(n, d);
/** Signed id-ID number; values that round to zero carry no sign (never "−0,0"). */
const sg = (n: number, d = 0) => {
  const r = Number(n.toFixed(d));
  return (r > 0 ? '+' : r < 0 ? MINUS : '') + formatId(Math.abs(n), d);
};

function Co2e() {
  return (
    <>
      CO<sub className="text-[0.7em]">2</sub>e
    </>
  );
}

function Row({ label, value, unit }: { label: string; value: string; unit: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-t border-line py-2 first:border-t-0">
      <dt className="text-body text-ink-2">{label}</dt>
      <dd className="num m-0 shrink-0 text-mono-s text-ink">
        {value} <span className="text-ink-2">{unit}</span>
      </dd>
    </div>
  );
}

/** "Apa yang belum dihitung": batasan jujur + emisi tertanam tambahan yang bisa diubah. */
export function ImpactLimits() {
  const a = useImpactState();
  const per = useImpactPer(a);
  const setCarbon = useStore((s) => s.setCarbon);
  const payback = per.incrementalPaybackYears;
  return (
    <div className="space-y-4">
      <ul className="m-0 list-none space-y-2 p-0">
        <li>
          {a.scenario === 'sunny'
            ? `Panas hanya dihitung pada jam yang punya beban air panas (${formatId(a.loadFraction * 100, 0)}% di sini). Pada jam tanpa beban, panel justru lebih panas dari PV biasa dan listriknya turun ±${formatId((1 - per.idle.electricalW / per.conv.electricalW) * 100, 0)}%. Angka 100% adalah batas atas.`
            : 'Skenario hujan tidak punya beban panas; hanya pembuangan panas yang dihitung.'}
        </li>
        <li>
          Pada hari hujan SolarVein tidak mengurangi emisi di sini. Pembuangan panas baru berguna bila ada pendingin yang digantikan. Dengan dry cooler sebagai pembanding, nilainya hanya sekitar <span className="tabular-nums text-ink">{f(netRejectionBenefitW(presetPair('rainy').dual, presetPair('rainy').conv), 0)}</span> W listrik per panel.{' '}
          <span className="text-ink">Panas buangan bukan listrik yang dihemat.</span>
        </li>
        <li>
          Emisi pembuatan tambahan (<span className="tabular-nums text-ink">{f(a.incrementalEmbodiedKg, 0)}</span> kg <Co2e /> per panel) sudah dihitung:{' '}
          {Number.isFinite(payback) ? (
            <>
              balik modal emisi <span className="tabular-nums text-ink">{f(payback, 1)}</span> tahun.
            </>
          ) : (
            'tidak balik modal pada skenario ini.'
          )}{' '}
          Emisi tertanam tidak pernah nol.
        </li>
        <li>Biaya, usia pakai, perawatan, dan perpipaan di lokasi belum dimodelkan.</li>
        <li>Simulasi konseptual. Bukan hasil uji lapangan.</li>
      </ul>
      <SliderRow
        id="impact-embodied"
        label="Emisi tertanam tambahan per panel"
        unit="kg CO2e"
        value={a.incrementalEmbodiedKg}
        min={50}
        max={400}
        step={10}
        defaultValue={180}
        onChange={(v) => setCarbon({ incrementalEmbodiedKg: v })}
        help="Penukar panas, insulasi, pompa, dan kontrol di atas modul PV biasa: ±100–250 kg CO2e."
      />
    </div>
  );
}

/** "Faktor emisi dan nilai kalor": faktor yang bisa diubah di tempat. */
export function ImpactFactors() {
  const a = useImpactState();
  const per = useImpactPer(a);
  const setCarbon = useStore((s) => s.setCarbon);
  return (
    <div className="space-y-4">
      <p>
        Listrik jaringan <span className="tabular-nums text-ink">{f(a.gridKgPerKWh, 2)}</span> kg <Co2e />/kWh, LPG (pembakaran){' '}
        <span className="tabular-nums text-ink">{f(a.fuelKgPerKWh, 3)}</span> kg <Co2e />/kWh bahan bakar, nilai kalor LPG 46 MJ/kg ({f(LPG_KWH_PER_KG, 1)} kWh/kg), efisiensi
        pemanas <span className="tabular-nums text-ink">{f(per.dual.inputs.boilerEfficiency * 100, 0)}%</span>. Semuanya bisa diubah.
      </p>
      <SliderRow
        id="impact-grid"
        label="Emisi listrik jaringan"
        unit="kg CO2e/kWh"
        value={a.gridKgPerKWh}
        min={0.1}
        max={1.2}
        step={0.01}
        defaultValue={0.8}
        onChange={(v) => setCarbon({ gridKgPerKWh: v })}
        help="Listrik PV menggantikan listrik jaringan. Indonesia ±0,8; bergantung wilayah dan tahun."
      />
      <SliderRow
        id="impact-fuel"
        label="Emisi bahan bakar pemanas"
        unit="kg CO2e/kWh"
        value={a.fuelKgPerKWh}
        min={0.1}
        max={0.4}
        step={0.005}
        defaultValue={0.23}
        format={(n) => formatId(n, 3)}
        onChange={(v) => setCarbon({ fuelKgPerKWh: v })}
        help="Pemanas yang digantikan panas panen. LPG ±0,23 per kWh bahan bakar."
      />
    </div>
  );
}

/** "Dari mana angkanya": buku besar per panel per tahun. */
export function ImpactLedger() {
  const a = useImpactState();
  const p = useImpactPer(a);
  // Baris-baris di bawah dijumlahkan menjadi total (termasuk jam tanpa beban, yang kehilangan listrik).
  const L = impactLedger(p, a);
  return (
    <div className="space-y-6">
      <div>
        <p className="text-label text-ink">Per panel, per tahun</p>
        <dl className="m-0 mt-2">
          <Row label="Listrik PV kotor" value={f(p.kWhElectricGross, 0)} unit={<>kWh<sub>e</sub></>} />
          <Row label="Listrik pompa" value={sg(-p.kWhPump, 1)} unit={<>kWh<sub>e</sub></>} />
          <Row label="PV biasa (acuan)" value={f(p.kWhElectricConv, 0)} unit={<>kWh<sub>e</sub></>} />
          <Row label="Panas berguna" value={f(p.kWhThermalUseful, 0)} unit={<>kWh<sub>th</sub></>} />
          <Row label="Panas dibuang" value={f(p.kWhThermalRejected, 0)} unit={<>kWh<sub>th</sub></>} />
        </dl>
      </div>
      <div>
        <p className="text-label text-ink">
          Selisih emisi terhadap PV biasa (kg <Co2e /> per tahun)
        </p>
        <dl className="m-0 mt-2">
          <Row label="Selisih listrik PV" value={sg(L.electricityDiffKg, 1)} unit="kg" />
          <Row label="Panas menggantikan LPG" value={sg(L.heatKg, 1)} unit="kg" />
          <Row label="Pendingin yang digantikan" value={sg(L.coolingKg, 1)} unit="kg" />
          <Row label="Listrik pompa" value={sg(L.pumpKg, 1)} unit="kg" />
          <Row label="Total" value={sg(L.total, 1)} unit="kg" />
        </dl>
        <p className="mt-3 text-small">
          Daya dari simulasi × jam setara ÷ 1000 × faktor emisi. Hanya emisi yang dijumlahkan; kWh<sub>e</sub> dan kWh<sub>th</sub> tidak pernah dijumlahkan.
        </p>
      </div>
    </div>
  );
}
