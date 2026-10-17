import { useMemo, useSyncExternalStore } from 'react';
import { stepAt, type DayResult, type DayStep } from '../../sim/system';
import { useSystemStore } from '../../state/system';
import { useDay } from '../../state/systemSelectors';

/**
 * During the entry sweep the playhead moves at display rate, but writing every frame to the global store re-renders
 * every section that reads the hour (Sistem readouts, Lab charts, the 3D engine). So the sweep publishes the hour on
 * this small bus at display rate (read only by the Sehari leaves: scrubber, playhead, readout) and commits it to the
 * store once, when the sweep ends or is interrupted.
 */
let live: number | null = null;
const subs = new Set<() => void>();

export const getLiveHour = (): number | null => live;

export function setLiveHour(h: number | null): void {
  live = h;
  subs.forEach((f) => f());
}

/** Write the live hour (if any) to the store and clear it. */
export function commitLiveHour(): void {
  if (live !== null) useSystemStore.getState().setHour(live);
  setLiveHour(null);
}

const subscribe = (cb: () => void): (() => void) => {
  subs.add(cb);
  const off = useSystemStore.subscribe(cb);
  return () => {
    subs.delete(cb);
    off();
  };
};

const snapshot = (): number => live ?? useSystemStore.getState().hour;

/** The hour to draw: the live sweep hour while a sweep runs, otherwise the store hour. */
export function useDayHour(): number {
  return useSyncExternalStore(subscribe, snapshot, snapshot);
}

/** Interpolated step at the drawn hour (same lookup as `useStep`, but follows the live sweep hour). */
export function useDayStep(day?: DayResult): { step: DayStep; hour: number } {
  const hour = useDayHour();
  const fallback = useDay();
  const d = day ?? fallback;
  const step = useMemo(() => stepAt(d, hour), [d, hour]);
  return { step, hour };
}
