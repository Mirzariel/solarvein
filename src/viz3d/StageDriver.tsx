/**
 * Advances the stage's explode factor once per frame (critically damped spring, w = 9 -> ~650 ms,
 * no bounce, velocity kept on retarget) and keeps the demand-driven render loop alive while it moves.
 * Reduced motion snaps. Runs first (negative priority) so every other useFrame sees this frame's value.
 */
import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useRef } from 'react';
import { useReducedMotion } from '../hooks';
import { Spring } from './spring';
import { useStage, useStageState } from './stage';

const EXPLODE_W = 9;

export function StageDriver() {
  const stage = useStage();
  const reduced = useReducedMotion();
  const invalidate = useThree((s) => s.invalidate);
  const exploded = useStageState(stage.store, (s) => s.exploded);
  const spring = useRef<Spring | null>(null);
  if (spring.current === null) spring.current = new Spring(stage.explode.current);

  // Ask for a frame from DOM code (chrome buttons, annotation selection ...).
  useEffect(() => {
    stage.wake.current = invalidate;
    return () => {
      stage.wake.current = null;
    };
  }, [stage.wake, invalidate]);

  // Any stage-state change needs one frame (focus dim, visibility, cross-section, hover).
  useEffect(() => stage.store.subscribe(() => invalidate()), [stage.store, invalidate]);

  useEffect(() => {
    if (reduced) {
      const sp = spring.current;
      if (sp) sp.snap(exploded ? 1 : 0);
      stage.explode.current = exploded ? 1 : 0;
    }
    invalidate();
  }, [reduced, exploded, invalidate, stage.explode]);

  useFrame((state, delta) => {
    const sp = spring.current;
    if (!sp) return;
    const goal = exploded ? 1 : 0;
    if (reduced) {
      sp.snap(goal);
      stage.explode.current = goal;
      return;
    }
    if (sp.settled(goal)) {
      if (stage.explode.current !== goal) {
        sp.snap(goal);
        stage.explode.current = goal;
      }
      return;
    }
    stage.explode.current = sp.step(goal, EXPLODE_W, Math.min(delta, 0.05));
    stage.boost.current = performance.now() + 300;
    state.invalidate();
  }, -10);

  return null;
}
