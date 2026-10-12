import { useFrame } from '@react-three/fiber';
import { useLayoutEffect } from 'react';
import { useStageOptional } from '../stage';
import type { EffectProps } from './shared';

/**
 * Writes the sky mood (sun 0..1, rain 0..1) of the VISUAL frame into the stage mood target every frame and marks
 * it `driven`, so the studio (lights, environment, floor, haze) is the single owner of the lighting and simply
 * follows the interpolated irradiance and rain. No lights are created here.
 */
export function AmbientMood({ targets }: EffectProps) {
  const stage = useStageOptional();

  useLayoutEffect(() => {
    if (!stage) return;
    const m = stage.mood.current;
    m.driven = true;
    m.sun = targets.current.moodSun;
    m.rain = targets.current.moodRain;
    return () => {
      m.driven = false;
    };
  }, [stage, targets]);

  useFrame(() => {
    if (!stage) return;
    const m = stage.mood.current;
    const t = targets.current;
    m.driven = true;
    m.sun = t.moodSun;
    m.rain = t.moodRain;
  }, -5);
  return null;
}
