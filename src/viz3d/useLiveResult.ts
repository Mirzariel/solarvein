/**
 * Ref-based access to the live SimResult inside the Canvas: no React re-render when the inputs change,
 * the ref is updated and one frame is requested. This is the single swap point for the Motion Director's
 * weather engine: the result is the VISUAL frame (interpolated inputs -> simulate()), so liquid colours,
 * cell tint and studio lighting follow the same computed states as the arrows, rain and readouts.
 */
import type { MutableRefObject } from 'react';
import { useVisualResultRef } from '../motion/useVisualResultRef';
import type { SimResult } from '../sim';

export function useLiveResultRef(): MutableRefObject<SimResult> {
  return useVisualResultRef();
}
