/**
 * Binds the v2 store to the visual clock (src/motion/systemEngine.ts) by an external subscription: the store
 * needs no change. Target per change = the cached DayResult of (sys, scenario, strategy) stepped at `hour`.
 *
 * Change classification (what the viewer should SEE):
 *  - scripted (~1,1 s staggered transition): a mode target A/B/C was chosen, or the scenario or strategy changed.
 *  - follow (springs, retargetable mid-flight): hour scrubbing (the store sets modeTarget 'custom'), system edits.
 *  - snap: first load, reduced motion and hidden tab (the engine decides the last two itself).
 */
import type { SystemEngine, ChangeKind } from '../motion/systemEngine';
import { targetAt, type SystemTarget } from '../motion/systemTarget';
import type { SystemState } from './system';
import { useSystemStore } from './system';

type TargetState = Pick<SystemState, 'sys' | 'scenario' | 'strategy' | 'hour'>;
type ChangeState = TargetState & Pick<SystemState, 'modeTarget'>;

export const targetFromState = (s: TargetState): SystemTarget => targetAt(s.sys, s.scenario, s.strategy, s.hour);

/** Which animation a store change deserves. */
export function classifyChange(prev: ChangeState, next: ChangeState): ChangeKind {
  if (next.scenario !== prev.scenario || next.strategy !== prev.strategy) return 'scripted';
  if (next.modeTarget !== prev.modeTarget && next.modeTarget !== 'custom') return 'scripted';
  return 'follow';
}

/** Subscribe the engine to the store. Returns the unsubscribe function. */
export function bindSystemEngine(engine: SystemEngine, store: typeof useSystemStore = useSystemStore): () => void {
  return store.subscribe((s, prev) => {
    if (s.sys === prev.sys && s.scenario === prev.scenario && s.strategy === prev.strategy && s.hour === prev.hour) return;
    engine.setTarget(targetFromState(s), { kind: classifyChange(prev, s) });
  });
}
