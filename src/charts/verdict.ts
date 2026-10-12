import { NOT_BENEFICIAL_MESSAGE, type CollectorConfig, type SimResult } from '../sim';
import { netRejectionBenefitW } from '../state/impact';
import { fmt, fmtSigned } from './format';

export type VerdictTone = 'neutral' | 'heat' | 'cool';
export type VerdictKind = 'conventional-better' | 'harvest' | 'rejection' | 'rejection-not-worth' | 'electrical-only';

export interface Verdict {
  kind: VerdictKind;
  tone: VerdictTone;
  headline: string;
  /** Alasan berbasis angka (teks Indonesia). */
  reasons: string[];
}

export type ComparisonSet = Record<CollectorConfig, SimResult>;

/** Ambang "ada manfaat termal nyata" [W_th]. */
const EPS_W = 0.5;
/** Selisih listrik yang dianggap setara [W_e]. */
const TIE_W = 0.5;

/**
 * Vonis jujur berbasis aturan dan angka dari simulasi. Tidak pernah menyatakan mode ganda unggul secara bawaan:
 *  1. Tidak ada panas berguna dan tidak ada pembuangan nyata → bandingkan hanya listrik net. PV konvensional menang
 *     bila net-nya ≥ semua konfigurasi lain (dalam toleransi 0,5 W_e).
 *  2. Ada panas berguna (beban panas nyata) → PVT bernilai karena panas; selisih listrik dilaporkan apa adanya.
 *  3. Ada pembuangan nyata (sumber panas nyata) → hanya SolarVein yang mendapat manfaat ini, dengan biaya pompa
 *     dan perubahan daya PV yang disebutkan; setara listrik pendingin hanya bila pendingin mekanis memang digantikan.
 */
export function computeVerdict(c: ComparisonSet): Verdict {
  const conv = c['conventional-pv'];
  const harv = c['pvt-harvest-only'];
  const dual = c['solarvein-dual'];
  const inp = dual.inputs;

  const usefulHeat = Math.max(harv.usefulHeatW, dual.usefulHeatW);
  const rejected = dual.heatRejectedW;
  const dNetDual = dual.netElectricalW - conv.netElectricalW;
  const dNetHarv = harv.netElectricalW - conv.netElectricalW;
  const reasons: string[] = [];

  // ── 3. Pembuangan panas nyata ──
  if (rejected > EPS_W) {
    // Manfaat bersih = listrik pendingin yang digantikan − pompa − penurunan daya PV (acuan PV biasa).
    const netBenefit = netRejectionBenefitW(dual, conv);
    const worth = netBenefit > 0;
    reasons.push(
      `SolarVein membuang ${fmt(rejected, 0)} W termal dari loop proses hangat (T masuk ${fmt(inp.inletC, 1)} °C, T sel ${fmt(dual.cellC, 1)} °C). PV konvensional dan PVT hanya-panen tidak membuang panas sama sekali.`,
    );
    reasons.push(
      `Jika pendingin mekanis memang digantikan (COP ${fmt(inp.coolingCOP, 1)}), ini setara ±${fmt(dual.avoidedCoolingElecW, 1)} W listrik pendingin; pompa memakai ${fmt(dual.pumpW, 1)} W listrik. Manfaat bersih setelah pompa dan penurunan daya PV: ${fmtSigned(netBenefit, 1)} W listrik.`,
    );
    reasons.push(
      `Net listrik panel SolarVein ${fmt(dual.netElectricalW, 1)} W, ${dNetDual >= 0 ? 'lebih tinggi' : 'lebih rendah'} ${fmt(Math.abs(dNetDual), 1)} W daripada PV konvensional (${fmt(conv.netElectricalW, 1)} W).`,
    );
    if (!worth) {
      reasons.push(NOT_BENEFICIAL_MESSAGE);
      return {
        kind: 'rejection-not-worth',
        tone: 'neutral',
        headline: 'Panas memang terbuang, tetapi tidak sepadan dengan listrik pompa.',
        reasons,
      };
    }
    return {
      kind: 'rejection',
      tone: 'cool',
      headline: `Hanya SolarVein yang bisa membuang panas di sini. Manfaat bersihnya sekitar ${fmt(netBenefit, 0)} W listrik, bergantung pada pendingin yang digantikan.`,
      reasons,
    };
  }

  // ── 2. Panen panas nyata ──
  if (usefulHeat > EPS_W) {
    const best = dual.usefulHeatW >= harv.usefulHeatW ? dual : harv;
    reasons.push(
      `Panas berguna ${fmt(best.usefulHeatW, 0)} W termal dipanen ke beban panas; menggantikan ±${fmt(best.avoidedFuelW, 0)} W bahan bakar (efisiensi pemanas ${fmt(inp.boilerEfficiency * 100, 0)} %).`,
    );
    reasons.push(
      `Net listrik PVT hanya-panen ${fmt(harv.netElectricalW, 1)} W (${fmtSigned(dNetHarv, 1)} W dibanding PV konvensional ${fmt(conv.netElectricalW, 1)} W); SolarVein ${fmt(dual.netElectricalW, 1)} W (${fmtSigned(dNetDual, 1)} W).`,
    );
    if (Math.abs(dual.usefulHeatW - harv.usefulHeatW) < EPS_W && dual.heatRejectedW <= EPS_W) {
      reasons.push('Mode pembuangan tidak aktif (tidak ada sumber panas yang perlu didinginkan), sehingga SolarVein setara dengan PVT hanya-panen di kondisi ini.');
    }
    if (dNetDual < -TIE_W) {
      reasons.push(
        `Ada pertukaran: listrik net turun ${fmt(-dNetDual, 1)} W_e demi ${fmt(best.usefulHeatW, 0)} W_th panas. Kedua besaran beda jenis energi dan tidak dijumlahkan; nilainya bergantung pada harga atau emisi listrik dan bahan bakar Anda.`,
      );
    }
    return {
      kind: 'harvest',
      tone: 'heat',
      headline: 'Ada panas untuk dipanen. PVT menangkapnya, PV konvensional tidak.',
      reasons,
    };
  }

  // ── 1. Tidak ada manfaat termal ──
  if (!inp.heatLoadAvailable) reasons.push('Tidak ada beban panas yang bisa memakai panas hasil panen.');
  else reasons.push('Panas yang bisa dipanen terlalu kecil dibanding daya pompa.');
  if (!inp.hotSourceAvailable) reasons.push('Tidak ada sumber panas yang perlu dibuang, jadi pembuangan panas tidak membawa manfaat (SolarVein tidak membuat panas).');
  else reasons.push(NOT_BENEFICIAL_MESSAGE);

  const bestNet = Math.max(conv.netElectricalW, harv.netElectricalW, dual.netElectricalW);
  if (conv.netElectricalW >= bestNet - TIE_W) {
    const stagGap = harv.cellC - conv.cellC;
    if (!harv.pumpOn && !dual.pumpOn && stagGap > 0.5) {
      reasons.push(
        `PVT berinsulasi tanpa sirkulasi lebih panas: T sel ${fmt(harv.cellC, 1)} °C dibanding ${fmt(conv.cellC, 1)} °C pada PV konvensional (+${fmt(stagGap, 1)} K), sehingga listrik PV ${fmt(conv.electricalW - harv.electricalW, 1)} W lebih rendah.`,
      );
    }
    reasons.push(
      `Net listrik: PV konvensional ${fmt(conv.netElectricalW, 1)} W, PVT hanya-panen ${fmt(harv.netElectricalW, 1)} W, SolarVein ${fmt(dual.netElectricalW, 1)} W.`,
    );
    return {
      kind: 'conventional-better',
      tone: 'neutral',
      headline: 'Di kondisi ini, PV konvensional lebih baik.',
      reasons,
    };
  }

  const winner: CollectorConfig = dual.netElectricalW >= harv.netElectricalW ? 'solarvein-dual' : 'pvt-harvest-only';
  const w = c[winner];
  reasons.push(
    `Satu-satunya perbedaan ada di listrik: net ${fmt(w.netElectricalW, 1)} W untuk ${winner === 'solarvein-dual' ? 'SolarVein' : 'PVT hanya-panen'} vs ${fmt(conv.netElectricalW, 1)} W untuk PV konvensional (${fmtSigned(w.netElectricalW - conv.netElectricalW, 1)} W).` +
      (w.pumpOn ? ' Pompa menyala sehingga panel lebih dingin, tetapi tidak ada panas yang dimanfaatkan.' : ''),
  );
  return {
    kind: 'electrical-only',
    tone: 'neutral',
    headline: 'Tidak ada panas yang berguna. Bedanya hanya di listrik.',
    reasons,
  };
}

/** Selisih di bawah ini dianggap setara [W]. */
const TIE = 0.5;

/**
 * Kolom yang benar-benar unggul pada kondisi ini. Seri (selisih < 0,5 W) tidak punya pemenang: null.
 * PV + pendingin cairan dan SolarVein identik saat tidak ada sumber panas, jadi tidak ada yang "unggul" di antara keduanya.
 */
export function winnerOf(v: Verdict, d: ComparisonSet): CollectorConfig | null {
  const conv = d['conventional-pv'];
  const harv = d['pvt-harvest-only'];
  const dual = d['solarvein-dual'];
  const tiePvt = Math.abs(dual.usefulHeatW - harv.usefulHeatW) < TIE && Math.abs(dual.netElectricalW - harv.netElectricalW) < TIE && Math.abs(dual.heatRejectedW - harv.heatRejectedW) < TIE;
  switch (v.kind) {
    case 'conventional-better':
      return 'conventional-pv';
    case 'rejection':
      return 'solarvein-dual';
    case 'harvest': {
      if (tiePvt) return null;
      return dual.usefulHeatW >= harv.usefulHeatW ? 'solarvein-dual' : 'pvt-harvest-only';
    }
    case 'electrical-only': {
      if (Math.abs(dual.netElectricalW - harv.netElectricalW) < TIE) return null;
      return dual.netElectricalW > harv.netElectricalW ? 'solarvein-dual' : 'pvt-harvest-only';
    }
    default:
      void conv;
      return null;
  }
}
