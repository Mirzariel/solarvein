import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useRef } from 'react';
import { useReducedMotion } from '../../hooks';
import { weather } from '../../motion/engine';
import { useStageOptional } from '../stage';
import { useExplodeFactor } from '../useExplodeFactor';
import { AmbientMood } from './AmbientMood';
import { ElectricPulses } from './ElectricPulses';
import { HeatArrows } from './HeatArrows';
import { Rain } from './Rain';
import { Sunlight } from './Sunlight';
import { deriveTargetsInto, makeTargets } from './targets';
import type { EffectProps } from './shared';

/** The v1 viewer toggle is retired: heat arrows always follow the sim. */
const showHeatArrows = true;

/**
 * All simulation-driven overlays for the collector scene. Render inside <Canvas>, in the collector's
 * coordinate frame (panel centred at the origin, +Y towards the sun).
 *
 * Every effect reads ONE source: the weather engine's visual frame (interpolated inputs -> simulate()).
 * There are no private smoothers on input-derived values: when the frame says G = 444 W/m2 and q = +210 W, the
 * light, the arrows and the pulses all show exactly that state. Nothing animates for decoration.
 * v2 = harvest only: heat arrows go cell -> liquid (never reversed, never cyan). Rain is NOT part of the story; the
 * subtle grey streaks only appear when `frame.climate.rainMmH > 0` (never from the v1 inputs) and the glass never
 * gets wet or cooler-looking.
 */
export function SceneEffects() {
  const reduced = useReducedMotion();
  const invalidate = useThree((s) => s.invalidate);
  const explode = useExplodeFactor();
  // the inspect stage (02) shows the layers, not the weather: no sun rays, rain or electrical pulses there
  const weatherFx = useStageOptional()?.variant !== 'inspect';

  const frame0 = weather.frame();
  const targets = useRef(deriveTargetsInto(makeTargets(), frame0.result, showHeatArrows, frame0));
  const version = useRef(0);
  const seen = useRef({ epoch: weather.frame().epoch, show: showHeatArrows });

  // wake a demand-driven render loop for every new visual frame (and when the viewer toggle changes)
  useEffect(() => {
    invalidate();
    return weather.subscribe(() => invalidate(), 0);
  }, [invalidate]);
  useEffect(() => {
    invalidate();
  }, [showHeatArrows, invalidate]);

  // one derive per changed frame, before the effects' own useFrame callbacks (priority -6)
  useFrame(() => {
    const f = weather.frame();
    if (f.epoch !== seen.current.epoch || showHeatArrows !== seen.current.show) {
      seen.current.epoch = f.epoch;
      seen.current.show = showHeatArrows;
      deriveTargetsInto(targets.current, f.result, showHeatArrows, f);
      version.current++;
    }
  }, -6);

  const props: EffectProps = { targets, version, explode, reduced };
  return (
    <group name="scene-effects">
      <AmbientMood {...props} />
      {weatherFx ? <Sunlight {...props} /> : null}
      {weatherFx ? <Rain {...props} /> : null}
      {weatherFx ? <ElectricPulses {...props} /> : null}
      <HeatArrows {...props} />
    </group>
  );
}
