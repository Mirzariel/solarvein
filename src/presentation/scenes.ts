/**
 * Presentation scenes. The registry (src/sections/nav.ts PRESENTATION_SCENES) gives the section order: the first
 * four are the ~3-minute demo path, the rest Q&A backup. A ninth, backup scene "Bagaimana jika hujan 3 hari?"
 * jumps to #sehari with the 72 h view.
 */
import { PRESENTATION_SCENES, SECTION } from '../sections/nav';

export interface Scene {
  /** Section id to jump to. */
  id: string;
  label: string;
  /** Part of the ~3-minute demo path. */
  demo: boolean;
  /** Needs the 72 h day view. */
  rain3?: boolean;
}

export const RAIN_SCENE_LABEL = 'Bagaimana jika hujan 3 hari?';

export function buildScenes(ids: readonly string[] = PRESENTATION_SCENES): Scene[] {
  const base: Scene[] = ids.map((id) => ({ id, label: SECTION[id]?.label ?? id, demo: SECTION[id]?.demo ?? false }));
  return [...base, { id: 'sehari', label: RAIN_SCENE_LABEL, demo: false, rain3: true }];
}

export const SCENES: readonly Scene[] = buildScenes();

/** cursor -1 = before the first scene (the opening). Clamped to [-1, n-1]. */
export function stepCursor(cursor: number, delta: 1 | -1, n: number): number {
  return Math.min(Math.max(cursor + delta, -1), n - 1);
}

/**
 * Cursor for a scroll position: the last scene whose section top is at or above `line` (px from the viewport top).
 * `tops[i]` is the section top of scene i (null when the section is not mounted). The rain backup shares Sehari's
 * section, so it is never picked from position alone; if `prev` already points at a scene with the winning section
 * id, `prev` is kept.
 */
export function cursorFromTops(tops: readonly (number | null)[], line: number, scenes: readonly Scene[], prev: number): number {
  let best = -1;
  for (let i = 0; i < scenes.length; i++) {
    const t = tops[i];
    if (t === null || t === undefined) continue;
    if (scenes[i]!.rain3) continue;
    if (t <= line) best = i;
  }
  if (best >= 0 && prev >= 0 && scenes[prev]?.id === scenes[best]?.id) return prev;
  return best;
}
