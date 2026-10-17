/**
 * Layout of the illustrative hotel roof (scene units = metres; the hero collector sits at the origin, 1.0 m along
 * X x 1.7 m along Z, rails on the roof surface at ROOF_Y). Shared by RoofContext (geometry) and CameraRig (the
 * 'hotel' pull-back framing). The roof is restrained on purpose: product on a bench, no city, no ground clutter.
 */
import { ROOF_Y } from './geometry';

export const HOTEL = {
  /** Roof deck footprint. The hero camera never sees beyond x = -3. */
  deck: { x0: -4.7, x1: 2.0, z0: -3.0, z1: 3.0, thick: 1.2 },
  parapet: { h: 0.4, t: 0.16 },
  /** Plant-room box (lift motor room / water heater room) against the back parapet. */
  plant: { cx: -3.85, cz: -1.3, w: 1.2, d: 1.7, h: 1.0 },
  /** Two faded neighbour modules in the same row as the hero (same size, same orientation). */
  ghosts: [
    { x: -1.3, z: 0 },
    { x: -2.5, z: 0 },
  ],
  /** Points the 'hotel' framing has to fit (scene units). */
  frame: {
    x0: -4.4,
    x1: 0.9,
    z0: -2.6,
    z1: 2.1,
    y0: ROOF_Y,
    y1: 1.0,
  },
} as const;
