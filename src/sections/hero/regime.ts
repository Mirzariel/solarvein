import { NOT_BENEFICIAL_MESSAGE, type SimResult } from '../../sim';
import { fmt } from './format';

export type StatementKey =
  | 'harvest'
  | 'reject'
  | 'not-beneficial'
  | 'idle-off'
  | 'idle-auto'
  | 'idle-none'
  | 'neg-noload'
  | 'neg-nosource'
  | 'neg-small';

export type StatementTone = 'heat' | 'cool' | 'neutral';

export interface Statement {
  key: StatementKey;
  tone: StatementTone;
  /** Mode label shown beside the 6 px dot ("Panen panas"). */
  pill: string;
  /** The one sentence. */
  headline: string;
  /** One short supporting line (numbers from the same SimResult). */
  detail: string;
}

/** q < -20 W but not worth the pump: the model's own advisory explains it better than the generic detail. */
function notBeneficialDetail(r: SimResult, tIn: string): string {
  const adv = r.advisories.find((a) => a.code === 'PUMP_EXCEEDS_BENEFIT');
  if (adv && r.qLiquidW < -20) return adv.message;
  return `Cairan ${tIn}, panel ${deg(r.cellC)}. Cairan belum cukup hangat dibanding panel, jadi panas yang bisa dibuang tidak sepadan dengan listrik pompa.`;
}

/** A rejection scenario is "in play": a hot source exists and harvesting is not the obvious story. */
function rejectionContext(r: SimResult): boolean {
  const i = r.inputs;
  return i.hotSourceAvailable && !(i.heatLoadAvailable && r.cellC > r.inletC);
}

const NB = ' ';
const deg = (n: number): string => `${fmt(n, 1)}${NB}°C`;
const watt = (n: number, d = 0): string => `${fmt(n, d)}${NB}W`;

/**
 * Turn a SimResult into the one sentence the user reads first (copy deck: docs/audit/07-creative-direction-v2.md A.2).
 * Wording follows docs/CONTRACT.md golden rules; "Pendinginan tidak menguntungkan pada kondisi ini." is verbatim.
 */
export function describeRegime(r: SimResult): Statement {
  const tIn = deg(r.inletC);
  const tOut = deg(r.outletC);
  const rejCtx = rejectionContext(r);

  switch (r.regime) {
    case 'harvest':
      return {
        key: 'harvest',
        tone: 'heat',
        pill: 'Panen panas',
        headline: 'Panel memanen panas.',
        detail: `Cairan masuk ${tIn}, keluar ${tOut}. Panasnya siap dipakai.`,
      };
    case 'reject':
      return {
        key: 'reject',
        tone: 'cool',
        pill: 'Pembuangan panas',
        headline: r.inputs.rainMmH > 0 ? 'Panel membuang panas ke udara, langit, dan hujan.' : 'Panel membuang panas ke udara dan langit.',
        detail: `Cairan masuk ${tIn}, keluar ${tOut}. Panas pindah dari cairan ke panel, lalu ke lingkungan.`,
      };
    case 'negligible': {
      if (r.qLiquidW > 0 && !r.inputs.heatLoadAvailable) {
        return {
          key: 'neg-noload',
          tone: 'neutral',
          pill: 'Tanpa beban panas',
          headline: 'Pompa menyala, tapi tak ada beban yang memakai panasnya.',
          detail: `Cairan menerima ±${watt(r.qLiquidW)}. Tanpa beban panas, ini tidak dihitung sebagai manfaat.`,
        };
      }
      if (r.qLiquidW < 0 && !r.inputs.hotSourceAvailable) {
        return {
          key: 'neg-nosource',
          tone: 'neutral',
          pill: 'Tanpa sumber panas',
          headline: 'Cairan lebih hangat dari panel, tapi tak ada panas yang perlu dibuang.',
          detail: 'Pembuangan tidak dihitung sebagai manfaat tanpa sumber hangat yang nyata.',
        };
      }
      if (rejCtx) {
        return {
          key: 'not-beneficial',
          tone: 'neutral',
          pill: 'Tidak menguntungkan',
          headline: NOT_BENEFICIAL_MESSAGE,
          detail: notBeneficialDetail(r, tIn),
        };
      }
      return {
        key: 'neg-small',
        tone: 'neutral',
        pill: 'Pertukaran kecil',
        headline: 'Pertukaran panasnya terlalu kecil untuk berarti.',
        detail: `Aliran ke cairan hanya ${watt(r.qLiquidW)}, sebanding dengan daya pompa ${watt(r.pumpW, 1)}.`,
      };
    }
    case 'idle':
    default: {
      if (r.inputs.pumpControl === 'off') {
        return {
          key: 'idle-off',
          tone: 'neutral',
          pill: 'Pompa mati',
          headline: 'Pompa dimatikan. Cairan diam.',
          detail: `Panel stagnan di ${deg(r.cellC)}. Panas tertahan insulasi dan daya listrik ikut turun.`,
        };
      }
      if (rejCtx) {
        return {
          key: 'not-beneficial',
          tone: 'neutral',
          pill: 'Tidak menguntungkan',
          headline: NOT_BENEFICIAL_MESSAGE,
          detail: notBeneficialDetail(r, tIn),
        };
      }
      if (!r.inputs.heatLoadAvailable && !r.inputs.hotSourceAvailable) {
        return {
          key: 'idle-none',
          tone: 'neutral',
          pill: 'Pompa mati',
          headline: 'Pompa mati. Tak ada yang perlu dipanen atau dibuang.',
          detail: 'Tanpa beban panas dan tanpa sumber panas, pompa tidak diperlukan.',
        };
      }
      return {
        key: 'idle-auto',
        tone: 'neutral',
        pill: 'Pompa menunggu',
        headline: 'Pompa menahan diri.',
        detail: `Pengendali menahan pompa: panas yang bisa dipanen belum sepadan dengan listrik pompa. Panel ${deg(r.cellC)}.`,
      };
    }
  }
}
