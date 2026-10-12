/**
 * Drop-in replacement for `viz3d/useLiveResult.useLiveResultRef`: a ref to the VISUAL SimResult (the weather
 * engine's current computed state) that is updated without React renders, and requests one frame per change.
 * Use inside the R3F <Canvas> tree.
 */
import { useThree } from '@react-three/fiber';
import { useEffect, useRef, type MutableRefObject } from 'react';
import type { SimResult } from '../sim';
import { weather } from './engine';

export function useVisualResultRef(): MutableRefObject<SimResult> {
  const invalidate = useThree((s) => s.invalidate);
  const ref = useRef<SimResult>(weather.frame().result);
  useEffect(() => {
    ref.current = weather.frame().result;
    invalidate();
    return weather.subscribe((f) => {
      ref.current = f.result;
      invalidate();
    }, 0);
  }, [invalidate]);
  return ref;
}
