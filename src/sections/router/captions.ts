/**
 * Router captions: one Indonesian sentence per computed state. Pure strings, no React.
 *
 * The sentence is keyed by the COMPUTED mode, pump state and `RouterReason` (never by the band the user
 * scrolled to), so if the controller computes something other than the preset suggests, the page says what
 * was computed. Wording follows LABELS.reason and the sv-content-reduction rules (condition, not outcome).
 */
import { LABELS, type ControllerMode, type ModeTarget, type RouterReason, type Sink } from '../../sim/system';

export interface CaptionInput {
  mode: ControllerMode;
  pumpOn: boolean;
  reason: RouterReason;
  valves: Record<Sink, number>;
  /** Share of the hot-water demand that the existing heater still covers [0..1]. */
  backupShare: number;
}

/** Short lead naming the CONDITION of each controller mode (LABELS.mode carries the full state label). */
const LEAD: Record<ControllerMode, string> = {
  A: 'Sinar kuat',
  B: 'Sinar lemah',
  C: 'Tanpa sinar',
};

export function routerSentence(c: CaptionInput): string {
  const lead = LEAD[c.mode];
  if (c.pumpOn) {
    switch (c.reason) {
      case 'prioritas-air-panas':
        return `${lead}: panas langsung ke air panas yang sedang dipakai.`;
      case 'isi-tangki':
        return c.valves.dhw > 0.02
          ? `${lead}: panas langsung ke air panas, sisanya mengisi tangki.`
          : `${lead}: kebutuhan air panas sudah tertutup, panas mengisi tangki.`;
      case 'regenerasi-desikan':
        return `${lead}: tangki penuh, sisa panas meregenerasi desikan (hipotesis riset).`;
      case 'desikan-terlalu-dingin':
        return `${lead}: air keluar kolektor di bawah suhu minimum regenerasi desikan, jadi desikan tidak mendapat panas.`;
      case 'tangki-penuh-bypass':
        return `${lead}: tangki penuh dan tak ada pemakai lain; panas tidak diambil, sel tetap lebih dingin.`;
      default:
        return `${lead}: ${LABELS.reason[c.reason]}`;
    }
  }
  if (c.mode === 'C') {
    return c.backupShare > 0.05
      ? 'Tanpa sinar: tidak ada pengumpulan; tangki melepas simpanan, pemanas hotel menutup sisanya.'
      : 'Tanpa sinar: tidak ada pengumpulan; tangki melepas simpanan.';
  }
  if (c.mode === 'B') {
    return 'Sinar lemah: pompa diam agar kolektor dingin tidak mendinginkan tangki; air panas dari simpanan.';
  }
  return `${lead}: ${LABELS.reason[c.reason]}`;
}

/** The UI preset the user chose vs the mode the controller computed. Null when they agree. */
export function modeMismatch(target: ModeTarget | 'custom', computed: ControllerMode): string | null {
  if (target === 'custom' || target === computed) return null;
  return `Kondisi “${LABELS.modeTarget[target]}” dihitung controller sebagai mode ${computed}.`;
}

/** Accessible description of the diagram, generated from the same numbers the picture shows. */
export function diagramDescription(p: {
  mode: ControllerMode;
  pumpOn: boolean;
  shares: Record<Sink, number>;
  soc: number;
}): string {
  const pct = (x: number) => `${Math.round(x * 100)} persen`;
  const head = `Diagram aliran sistem, mode ${p.mode}. `;
  if (!p.pumpOn) return `${head}Pompa kolektor mati, tidak ada panas yang dikumpulkan. Tangki terisi ${pct(p.soc)} dan melepas panas ke air panas hotel.`;
  return `${head}Panas dari kolektor dibagi: ${pct(p.shares.dhw)} ke air panas langsung, ${pct(p.shares.tank)} ke tangki, ${pct(p.shares.desiccant)} ke regenerasi desikan, ${pct(p.shares.bypass)} tidak dipakai. Tangki terisi ${pct(p.soc)}.`;
}
