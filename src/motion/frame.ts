import type { SimInputs, SimResult } from '../sim';
import type { ClimatePoint, RouterSnapshot } from '../sim/system';

/** One visual frame of the system engine (src/motion/systemEngine.ts). */
export interface VisualFrame {
  /** Visual inputs of this frame (what the sim was run with). */
  inputs: SimInputs;
  /** simulate(inputs): always a real computed state. */
  result: SimResult;
  /** Scripted transition progress 0..1 (1 when idle). */
  progress: number;
  /** A transition or a follow spring is running. */
  moving: boolean;
  /** Increments on every change; consumers redraw when it differs from what they last drew. */
  epoch: number;
  /**
   * Router state at the current scenario time (valves/alloc interpolated toward the target with actuator
   * dynamics; read from the cached DayResult, never integrated per frame).
   */
  router?: RouterSnapshot;
  /** Climate at the current scenario time (sky, humidity). */
  climate?: ClimatePoint;
  /** Scenario hour of this frame (0..24, or 0..72 on the 3-day scenario; continuous, follows the clock sweep). */
  hour?: number;
  /** Hour of day 0..24 of this frame (hour mod 24). */
  hourOfDay?: number;
}

export type FrameListener = (f: VisualFrame) => void;
