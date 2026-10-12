/** Imperative camera API exposed by CollectorCanvas to the DOM chrome (which lives outside <Canvas>). */
export interface ViewerApi {
  /** Orbit the camera around the collector by one step. -1 = left, +1 = right. */
  rotate: (dir: -1 | 1) => void;
  /** Dolly in (+1) or out (-1) by one step. */
  zoom: (dir: -1 | 1) => void;
  /** Spring back to the home pose (~800 ms, critically damped, no bounce). */
  reset: () => void;
  /** Spring to an exact azimuth / polar (radians), e.g. the frontal view of the cross-section. */
  view?: (p: { az?: number; pol?: number; zoom?: number }) => void;
  /** Stills / QA: jump to an exact pose (angles in radians, distance and look-at in scene units). */
  setPose?: (p: { az: number; pol: number; r: number; ty: number; tx?: number; tz?: number }) => void;
}
