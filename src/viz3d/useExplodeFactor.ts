/**
 * Smoothly animated explode factor (0 = assembled, 1 = fully exploded) of the CURRENT stage,
 * shared by everything inside the Canvas (collector layers, effects arrows ...).
 *
 *   const explode = useExplodeFactor();            // call inside the <Canvas> tree
 *   useFrame(() => { y = layerY('channel', explode.current); });
 *
 * Returns a STABLE ref-like object whose `.current` is advanced once per frame by `StageDriver`
 * (critically damped spring, ~650 ms, no bounce, no React re-renders). Each stage has its own
 * factor: the hero stays assembled while the inspect stage is exploded.
 */
import { useStageOptional, type ExplodeRef } from './stage';

export type ExplodeFactorRef = ExplodeRef;

const FALLBACK: ExplodeRef = { current: 0 };

export function useExplodeFactor(): ExplodeFactorRef {
  const ctx = useStageOptional();
  return ctx ? ctx.explode : FALLBACK;
}
