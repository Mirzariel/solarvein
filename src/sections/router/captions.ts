/**
 * Router captions: one Indonesian sentence per computed state. Pure strings, no React.
 *
 * The sentence is keyed by the COMPUTED mode, pump state and `RouterReason` (never by the band the user
 * scrolled to), so if the controller computes something other than the preset suggests, the page says what
 * was computed. Pump-running sentences are LABELS.reason verbatim (the lead owns that wording); the pump-off
 * sentences name the condition, not an outcome. Mode B = daylight with the pump stopped (not "weak sun").
 */
import { LABELS, type ControllerMode, type ModeTarget, type RouterReason, type Sink } from '../../sim/system';

export interface CaptionInput {
  mode: ControllerMode;
  pumpOn: boolean;
  reason: RouterReason;
  /** Share of the hot-water demand that the existing heater still covers [0..1]. */
  backupShare: number;
}

export function routerSentence(c: CaptionInput): string {
  if (c.pumpOn) return LABELS.reason[c.reason];
  if (c.mode === 'C') {
    return c.backupShare > 0.05
      ? 'Tanpa sinar: tidak ada pengumpulan; tangki melepas simpanan, pemanas cadangan menutup sisanya.'
      : 'Tanpa sinar: tidak ada pengumpulan; tangki melepas simpanan.';
  }
  if (c.mode === 'B') return 'Pompa diam: kolektor tidak cukup hangat dibanding dasar tangki; air panas dari simpanan.';
  return LABELS.reason[c.reason];
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
  const pct = (x: number) => `${Math.round(Math.max(0, x) * 100)} persen`;
  const head = `Diagram aliran sistem, mode ${p.mode}. `;
  const sum = p.shares.bypass + p.shares.dhw + p.shares.tank + p.shares.desiccant;
  if (!p.pumpOn || sum < 0.02) return `${head}Pompa kolektor diam, tidak ada panas yang dikumpulkan. Tangki terisi ${pct(p.soc)} dan melepas panas ke air panas hotel.`;
  const norm = (x: number) => x / sum;
  return `${head}Panas dari kolektor dibagi: ${pct(norm(p.shares.dhw))} ke air panas langsung, ${pct(norm(p.shares.tank))} ke tangki, ${pct(norm(p.shares.desiccant))} ke regenerasi desikan, ${pct(norm(p.shares.bypass))} dilepas lewat pembuang panas (dry cooler). Tangki terisi ${pct(p.soc)}.`;
}
