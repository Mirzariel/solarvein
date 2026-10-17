import { useFrame } from '@react-three/fiber';
import { useLayoutEffect } from 'react';
import { useStageOptional } from '../stage';
import type { EffectProps } from './shared';

/**
 * Writes the sky mood of the VISUAL frame into the stage mood target every frame and marks it `driven`, so the
 * studio (lights, environment, floor, haze) is the single owner of the lighting and simply follows it.
 * v2: sun from G, humid from relative humidity, night from G + clock (all from `frame.climate`, falling back to the
 * collector inputs). Rain and heat flow never drive the light; `rain` stays 0 (no wet glass).
 * No lights are created here.
 */
export function AmbientMood({ targets }: EffectProps) {
  const stage = useStageOptional();

  useLayoutEffect(() => {
    if (!stage) return;
    const m = stage.mood.current;
    const t = targets.current;
    m.driven = true;
    m.sun = t.moodSun;
    m.rain = 0;
    m.humid = t.moodHumid;
    m.night = t.moodNight;
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
    m.rain = 0;
    m.humid = t.moodHumid;
    m.night = t.moodNight;
  }, -5);
  return null;
}
