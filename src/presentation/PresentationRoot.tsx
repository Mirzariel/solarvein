import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSystemStore } from '../state/system';
import { appMode } from './appMode';
import { applyUrlPreset } from './applyPreset';
import {
  applyScene,
  cancelJump,
  jumpToSection,
  openLabRincian,
  resetDemo,
  setCondition,
  setSmoothWheel,
  stripPresentationParam,
  whenLenis,
} from './controller';
import { Hud } from './Hud';
import { describeTarget, resolveKey, type PresentationAction } from './keys';
import { SCENES, cursorFromTops, stepCursor } from './scenes';
import './presentasi.css';

const HINTS_AUTO_HIDE_MS = 9000;

function PresentationController({ onExit }: { onExit: () => void }) {
  const [cursor, setCursor] = useState(-1);
  const [hints, setHints] = useState(true);
  const cursorRef = useRef(-1);
  const lockUntil = useRef(0);

  const commit = useCallback((i: number) => {
    cursorRef.current = i;
    setCursor(i);
    useSystemStore.getState().setScene(i);
  }, []);

  const goScene = useCallback(
    (i: number) => {
      const scene = SCENES[i];
      if (!scene) return;
      commit(i);
      applyScene(scene);
      lockUntil.current = performance.now() + 2200;
      jumpToSection(scene.id);
    },
    [commit],
  );

  const goTop = useCallback(() => {
    commit(-1);
    const st = useSystemStore.getState();
    if (st.dayView === '72h') {
      st.setDayView('24h');
      st.setModeTarget('A');
    }
    lockUntil.current = performance.now() + 2200;
    jumpToSection('awal');
  }, [commit]);

  const run = useCallback(
    (a: PresentationAction) => {
      switch (a.type) {
        case 'step': {
          const next = stepCursor(cursorRef.current, a.delta, SCENES.length);
          if (next === cursorRef.current) return;
          if (next < 0) goTop();
          else goScene(next);
          return;
        }
        case 'jump':
          goScene(a.index);
          return;
        case 'top':
          goTop();
          return;
        case 'reset':
          resetDemo();
          return;
        case 'lab': {
          const i = SCENES.findIndex((s) => s.id === 'lab');
          if (i >= 0) commit(i);
          applyScene(SCENES[i] ?? SCENES[0]!);
          lockUntil.current = performance.now() + 2200;
          openLabRincian();
          return;
        }
        case 'mode':
          setCondition(a.mode);
          return;
        case 'hints':
          setHints((h) => !h);
          return;
        case 'release-focus':
          (document.activeElement as HTMLElement | null)?.blur?.();
          return;
        case 'exit':
          onExit();
          return;
      }
    },
    [commit, goScene, goTop, onExit],
  );

  // Smooth wheel off (Lenis may start after this effect).
  useEffect(() => {
    const stop = whenLenis(() => setSmoothWheel(false));
    return () => {
      stop();
      setSmoothWheel(true);
    };
  }, []);

  // Keyboard.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const a = resolveKey(
        { key: e.key, ctrl: e.ctrlKey, alt: e.altKey, meta: e.metaKey, shift: e.shiftKey },
        describeTarget(e.target),
        SCENES.length,
      );
      if (!a) return;
      e.preventDefault();
      if (e.repeat && (a.type === 'step' || a.type === 'jump' || a.type === 'top' || a.type === 'lab')) return;
      run(a);
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [run]);

  // A mouse click leaves focus on the button/radio/tab, which would swallow Space and arrows: release it.
  useEffect(() => {
    const onUp = (e: PointerEvent) => {
      const t = (e.target as Element | null)?.closest?.('button, [role="radio"], [role="tab"], summary');
      if (t instanceof HTMLElement) requestAnimationFrame(() => t.blur());
    };
    document.addEventListener('pointerup', onUp, true);
    return () => document.removeEventListener('pointerup', onUp, true);
  }, []);

  // Manual scrolling cancels pending re-alignment and re-syncs the scene counter with the position.
  useEffect(() => {
    let timer = 0;
    const sync = () => {
      if (performance.now() < lockUntil.current) return;
      const tops = SCENES.map((s) => document.getElementById(s.id)?.getBoundingClientRect().top ?? null);
      const next = cursorFromTops(tops, window.innerHeight * 0.35, SCENES, cursorRef.current);
      if (next !== cursorRef.current) commit(next);
    };
    const onScroll = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(sync, 160);
    };
    const onUser = () => {
      cancelJump();
      lockUntil.current = 0;
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('wheel', onUser, { passive: true });
    window.addEventListener('touchstart', onUser, { passive: true });
    const first = window.setTimeout(sync, 500);
    return () => {
      window.clearTimeout(timer);
      window.clearTimeout(first);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('wheel', onUser);
      window.removeEventListener('touchstart', onUser);
    };
  }, [commit]);

  // Key hints fade out by themselves after the first seconds (H brings them back).
  useEffect(() => {
    const t = window.setTimeout(() => setHints(false), HINTS_AUTO_HIDE_MS);
    return () => window.clearTimeout(t);
  }, []);

  return <Hud scenes={SCENES} cursor={cursor} hints={hints} />;
}

/**
 * Mount once inside App (any position). Renders nothing unless the URL has `?presentasi=1`.
 * Also applies `?skenario=` / `?jam=` presets (in every mode) as a fallback to earlyPreset.ts.
 */
export default function PresentationRoot() {
  const initial = useMemo(() => appMode() === 'presentation', []);
  const [on, setOn] = useState(initial);

  useEffect(() => {
    applyUrlPreset();
  }, []);

  useEffect(() => {
    if (!on) return;
    const root = document.documentElement;
    root.classList.add('presentasi');
    useSystemStore.getState().setPresentation(true);
    return () => {
      root.classList.remove('presentasi');
      useSystemStore.getState().setPresentation(false);
    };
  }, [on]);

  const exit = useCallback(() => {
    stripPresentationParam();
    setOn(false);
  }, []);

  return on ? <PresentationController onExit={exit} /> : null;
}
