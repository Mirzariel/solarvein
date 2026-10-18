/**
 * SolarVein v2 — ekonomi terhadap pembanding (W4). Fungsi murni.
 *
 * Semua angka bersifat INKREMENTAL terhadap pembanding yang dipilih (`ledger.baselineId`):
 *  - capex = (PV/T × luas + BOS [+ desikan bila dihitung]) − capex pembanding (PV standar, pompa kalor, kit kondensor,
 *    atau PV/T + BOS-nya untuk B3); tidak pernah di bawah 0. Rendah/tengah/tinggi disejajarkan per indeks.
 *  - penghematan tahunan = biaya energi pembanding − biaya energi SolarVein (aliran energi sama dengan buku besar karbon),
 *    dikurangi O&M (fraksi × capex inkremental).
 *  - balik modal sederhana = capex inkremental / penghematan; Infinity bila penghematan ≤ 0.
 * Unit desikan tidak masuk capex secara bawaan karena manfaatnya juga tidak masuk angka utama (konsisten).
 */
import type { BaselineInputs, CarbonLedger, EconomicsResult, SystemInputs } from './contract';
import { caseFlows, heaterRates, type CaseFlows } from './carbon';
import { PV_KWP_PER_M2 } from './assumptions/carbon';
import {
  B3_BOS_CAPEX_SHARE,
  CONDENSER_KIT_CAPEX_IDR_PER_KW_TH,
  DHW_SIZING_HOURS_PER_DAY,
  HPWH_CAPEX_IDR_PER_KW_TH,
  LPG_NCV_KWH_PER_KG,
  PV_CAPEX_IDR_PER_KWP,
} from './assumptions/economics';

const fin = (x: number | undefined, fallback = 0): number => (typeof x === 'number' && Number.isFinite(x) ? x : fallback);
const nn = (x: number | undefined): number => Math.max(0, fin(x));
const at = (r: readonly number[], i: number): number => fin(r[i]);

type Tri = [number, number, number];
const tri = (f: (i: number) => number): Tri => [f(0), f(1), f(2)];

/** Biaya energi tahunan satu kasus [IDR/tahun]; PV menggantikan pembelian listrik jaringan. */
function energyCostIdr(sys: SystemInputs, f: CaseFlows): number {
  const e = sys.economics;
  const h = heaterRates(sys.hotel, sys.carbon);
  const cop = fin(sys.carbon.hpwhCop) > 0 ? fin(sys.carbon.hpwhCop) : 3.5;
  const gridKWhE = f.parasiticKWhE + f.heatPumpWorkKWhE + f.hpwhKWhTh / cop + f.heaterKWhTh * h.elecPerKWhTh - f.pvKWhE;
  const lpgKg = (f.heaterKWhTh * h.fuelPerKWhTh) / LPG_NCV_KWH_PER_KG;
  return gridKWhE * nn(e.gridTariffIdrPerKWh) + lpgKg * nn(e.lpgPriceIdrPerKg);
}

/** Infinity/NaN → null, untuk JSON dan ekspor (JSON.stringify mengubah Infinity menjadi null tanpa tanda). */
export function finiteOrNull(x: number): number | null {
  return typeof x === 'number' && Number.isFinite(x) ? x : null;
}

export function economicsFor(
  sys: SystemInputs,
  ledger: CarbonLedger,
  b: BaselineInputs,
  opts: { includeDesiccant?: boolean } = {},
): EconomicsResult {
  const e = sys.economics;
  const id = ledger.baselineId;
  const area = nn(b.areaM2);
  const installed = area > 0;
  const demand = nn(b.dhwDemandKWhThPerYear);
  const kWp = area * PV_KWP_PER_M2;
  const flows = caseFlows(sys, b);

  const capexSv = tri(
    (i) =>
      at(e.capexPvtIdrPerM2, i) * area +
      (installed ? at(e.capexBosIdr, i) : 0) +
      (opts.includeDesiccant && sys.desiccant.enabled && installed ? at(e.capexDesiccantIdr, i) : 0),
  );
  const dhwKwTh = demand / 365 / DHW_SIZING_HOURS_PER_DAY;
  const recoveredKwTh = (demand * Math.min(1, nn(sys.carbon.condenserRecoveryFraction))) / 365 / DHW_SIZING_HOURS_PER_DAY;
  const capexX = tri((i) => {
    switch (id) {
      case 'B1':
        return 0;
      case 'B2':
        return kWp * at(PV_CAPEX_IDR_PER_KWP, i) + dhwKwTh * at(HPWH_CAPEX_IDR_PER_KW_TH, i);
      case 'B3':
        return at(e.capexPvtIdrPerM2, i) * area + (installed ? at(e.capexBosIdr, i) * B3_BOS_CAPEX_SHARE : 0);
      case 'B4':
        return kWp * at(PV_CAPEX_IDR_PER_KWP, i) + recoveredKwTh * at(CONDENSER_KIT_CAPEX_IDR_PER_KW_TH, i);
    }
  });
  const inc = tri((i) => Math.max(0, capexSv[i]! - capexX[i]!));

  const opSaving = energyCostIdr(sys, flows[id]) - energyCostIdr(sys, flows.SV);
  const om = nn(e.omFractionPerYear);
  const savingAt = (i: number) => opSaving - om * inc[i]!;
  const paybackAt = (i: number): number => {
    const s = savingAt(i);
    if (!(s > 0)) return Infinity;
    return inc[i]! / s;
  };

  return {
    baselineId: id,
    capexIdr: inc,
    annualSavingIdr: fin(savingAt(1)),
    paybackYears: [paybackAt(0), paybackAt(1), paybackAt(2)],
    tag: 'asumsi',
  };
}
