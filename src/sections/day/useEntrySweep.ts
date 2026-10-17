import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';
import { useReducedMotion } from '../../ui';
import { useSystemStore } from '../../state/system';

const FROM_H = 6;
const TO_H = 24;
const DURATION_MS = 6000;

const ease = (p: number): number => 0.5 - 0.5 * Math.cos(Math.PI * p); // sine in-out

/**
 * One 06 → 24 h sweep of the playhead the first time the block is in view (~6 s). Any pointer, touch or key
 * press inside the block stops it for good. Reduced motion: no sweep (the playhead stays where it is).
 * Skipped in presentation mode and in the 72 h view, where the presenter owns the clock.
 * `replay()` plays the same sweep again on request (also hidden under reduced motion).
 */
export function useEntrySweep(block: RefObject<HTMLElement | null>): { replay: () => void; running: boolean; available: boolean } {
  const reduced = useReducedMotion();
  const [running, setRunning] = useState(false);
  const raf = useRef(0);
  const played = useRef(false);

  const stop = useCallback(() => {
    cancelAnimationFrame(raf.current);
    raf.current = 0;
    setRunning(false);
  }, []);

  const play = useCallback(() => {
    const st = useSystemStore.getState();
    if (st.dayView !== '24h') return;
    cancelAnimationFrame(raf.current);
    setRunning(true);
    const t0 = performance.now();
    const tick = (now: number) => {
      const p = Math.min(1, (now - t0) / DURATION_MS);
      useSystemStore.getState().setHour(FROM_H + (TO_H - FROM_H) * ease(p));
      if (p < 1) raf.current = requestAnimationFrame(tick);
      else {
        raf.current = 0;
        setRunning(false);
      }
    };
    raf.current = requestAnimationFrame(tick);
  }, []);

  // first entry
  useEffect(() => {
    const el = block.current;
    if (!el || reduced || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver(
      (entries) => {
        const e = entries[entries.length - 1];
        if (!e?.isIntersecting || played.current) return;
        const st = useSystemStore.getState();
        if (st.presentation || st.dayView !== '24h') {
          played.current = true;
          return;
        }
        played.current = true;
        play();
      },
      { threshold: 0.4 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [block, reduced, play]);

  // any touch stops it
  useEffect(() => {
    const el = block.current;
    if (!el) return;
    el.addEventListener('pointerdown', stop, true);
    el.addEventListener('touchstart', stop, { capture: true, passive: true });
    el.addEventListener('keydown', stop, true);
    return () => {
      el.removeEventListener('pointerdown', stop, true);
      el.removeEventListener('touchstart', stop, true);
      el.removeEventListener('keydown', stop, true);
      cancelAnimationFrame(raf.current);
    };
  }, [block, stop]);

  const replay = useCallback(() => {
    if (!reduced) play();
  }, [play, reduced]);

  return { replay, running, available: !reduced };
}
