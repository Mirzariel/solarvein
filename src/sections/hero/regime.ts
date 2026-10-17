import { NOT_BENEFICIAL_MESSAGE, type SimResult } from '../../sim';
import { LABELS, type ControllerMode, type DayStep, type RouterReason, type Sink } from '../../sim/system';
import { formatWithUnit } from '../../ui';
import { fmt } from './format';

/**
 * v2 statement of the Sistem section: ONE sentence + ONE detail line, keyed by the COMPUTED router mode and reason
 * (never by the A/B/C button the user pressed). The sentence is LABELS.reason verbatim (the single source of truth for
 * what the router is doing); the detail line adds the live numbers of the same DayStep. Labels name conditions.
 */
export interface Statement {
  /** `${mode}|${reason}`: changes only when the computed state changes, not when numbers tick. */
  key: string;
  mode: ControllerMode;
  reason: RouterReason;
  tone: 'heat' | 'neutral';
  /** Mode label with a 6 px dot ("A · Panas tersedia"), straight from LABELS.mode. */
  pill: string;
  /** The one sentence (LABELS.reason). */
  headline: string;
  /** One short supporting line with numbers from the same step. */
  detail: string;
}

const degC = (n: number): string => formatWithUnit(n, '°C', 0);

export function describeStep(step: DayStep): Statement {
  const { router, collector: c, tank, dhw } = step;
  let detail: string;
  if (router.pumpOn) {
    detail = `Cairan masuk ${degC(c.inletC)}, keluar ${degC(c.outletC)}; sel ${degC(c.cellC)}.`;
  } else if (router.mode === 'A') {
    detail = `Kolektor ${degC(c.cellC)}; dasar tangki ${degC(tank.bottomC)}.`;
  } else {
    detail = `Tangki atas ${degC(tank.topC)}, terisi ${Math.round(tank.soc * 100)}%.`;
  }
  if (!router.pumpOn && dhw.backupW > 0) detail += ' Pemanas yang ada menutup sisa kebutuhan.';
  return {
    key: `${router.mode}|${router.reason}`,
    mode: router.mode,
    reason: router.reason,
    tone: router.pumpOn && c.qLiquidW > 0 ? 'heat' : 'neutral',
    pill: LABELS.mode[router.mode],
    headline: LABELS.reason[router.reason],
    detail,
  };
}

const SINK_ORDER: readonly Sink[] = ['dhw', 'tank', 'desiccant', 'bypass'];

/**
 * Router allocation as whole-number shares that sum to exactly 100 (largest remainder), or null when nothing is
 * allocated (pump off). Input is the allocation in W_th; the shares are for display only.
 */
export function splitShares(alloc: Record<Sink, number>): Record<Sink, number> | null {
  const total = SINK_ORDER.reduce((s, k) => s + Math.max(0, alloc[k]), 0);
  if (total < 1) return null;
  const raw = SINK_ORDER.map((k) => ({ k, v: (Math.max(0, alloc[k]) / total) * 100 }));
  const floors = raw.map((r) => Math.floor(r.v));
  let rest = 100 - floors.reduce((a, b) => a + b, 0);
  const order = raw.map((r, i) => ({ i, f: r.v - floors[i]! })).sort((a, b) => b.f - a.f);
  for (const o of order) {
    if (rest <= 0) break;
    floors[o.i]!++;
    rest--;
  }
  return Object.fromEntries(raw.map((r, i) => [r.k, floors[i]])) as Record<Sink, number>;
}

export { SINK_ORDER };

// ─────────────────────────────────────────────────────────────────────────────
// LEGACY (v1 dual-mode regime). Kept only because src/sections/lab/LabStrip.tsx (W9b) still imports it.
// Delete with the v1 code at the cutover commit; nothing in the Sistem section uses it.
// ─────────────────────────────────────────────────────────────────────────────

export type LegacyStatementKey =
  | 'harvest'
  | 'reject'
  | 'not-beneficial'
  | 'idle-off'
  | 'idle-auto'
  | 'idle-none'
  | 'neg-noload'
  | 'neg-nosource'
  | 'neg-small';

export type LegacyStatementTone = 'heat' | 'cool' | 'neutral';

export interface LegacyStatement {
  key: LegacyStatementKey;
  tone: LegacyStatementTone;
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
export function describeRegime(r: SimResult): LegacyStatement {
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
