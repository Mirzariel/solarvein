import { useDeferredValue, useEffect, useState } from 'react';
import { getSystemView, type AreaSweepPoint, type RouterStrategy } from '../../sim/system';
import { useSystem } from '../../state/systemSelectors';

/**
 * The area sweep is the heaviest view tier (~1 s for 3 areas × 3 strategies). Run it one (area, strategy) pair per
 * timer tick so the main thread never blocks for more than one simulation, and let the table fill as results arrive.
 * Each pair goes through the sim view's own memo (`areaSweep([a], [s])`), so repeated opens are instant.
 * `enabled` keeps it off until the table is actually shown.
 */
export function useAreaSweepChunked(areasM2: readonly number[], strategies: readonly RouterStrategy[], enabled: boolean): { points: AreaSweepPoint[]; done: boolean } {
  const sys = useDeferredValue(useSystem());
  const [points, setPoints] = useState<AreaSweepPoint[]>([]);
  const [done, setDone] = useState(false);
  const key = areasM2.join(',') + '|' + strategies.join(',');

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    const view = getSystemView(sys);
    const queue: Array<[number, RouterStrategy]> = [];
    for (const a of areasM2) for (const s of strategies) queue.push([a, s]);
    const acc: AreaSweepPoint[] = [];
    setPoints([]);
    setDone(false);
    let timer = 0;
    const step = () => {
      if (cancelled) return;
      const next = queue.shift();
      if (!next) {
        setDone(true);
        return;
      }
      acc.push(...view.areaSweep([next[0]], [next[1]]));
      setPoints([...acc]);
      timer = window.setTimeout(step, 24);
    };
    timer = window.setTimeout(step, 60);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sys, enabled, key]);

  return { points, done };
}
