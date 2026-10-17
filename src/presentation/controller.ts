/**
 * Presentation controller: DOM + store side effects (no React). Pure decisions live in keys.ts / scenes.ts / preset.ts.
 */
import { getLenis } from '../motion/smoothScroll';
import { resolveHash } from '../sections/nav';
import { useSystemStore } from '../state/system';
import type { Scene } from './scenes';

/** Lenis' wheel smoothing off (native wheel; Lenis stays for ScrollTrigger sync and anchor links). Returns false while Lenis is not started. */
export function setSmoothWheel(enabled: boolean): boolean {
  const l = getLenis();
  if (!l) return false;
  l.options.smoothWheel = enabled;
  return true;
}

/** Child effects run before App's, so Lenis may not exist yet: retry on frames for up to `ms`. */
export function whenLenis(apply: () => boolean, ms = 4000): () => void {
  let stop = false;
  const t0 = performance.now();
  const tick = () => {
    if (stop || apply() || performance.now() - t0 > ms) return;
    requestAnimationFrame(tick);
  };
  tick();
  return () => {
    stop = true;
  };
}

function scrollInstant(y: number) {
  const l = getLenis();
  if (l) l.scrollTo(y, { immediate: true, force: true });
  else window.scrollTo({ top: y, behavior: 'instant' });
}

let jumpToken = 0;

/** Abort pending re-alignment passes (call on manual wheel/touch/pointer input). */
export function cancelJump() {
  jumpToken++;
}

/** Gap under the HUD rail when a focus element is aligned to the top of the viewport [px]. */
const FOCUS_TOP = 48;

/**
 * Per-scene focus when the section owner has not marked one. A section can mark its main exhibit with
 * `data-presentasi-focus`; the jump then aligns that element (not the section top) under the HUD.
 */
const FOCUS_FALLBACK: Readonly<Record<string, string>> = { sistem: '[data-stage-card]' };

export function focusTarget(section: HTMLElement, id: string): HTMLElement | null {
  const sel = FOCUS_FALLBACK[id];
  return section.querySelector<HTMLElement>('[data-presentasi-focus]') ?? (sel ? section.querySelector<HTMLElement>(sel) : null);
}

/**
 * Instant jump to a scene: the section top, or its focus element (see FOCUS_FALLBACK) just under the HUD. Lazy chunks
 * and ScrollTrigger pin spacers change the layout after the first jump, so the position is re-checked a few times
 * and corrected until it is stable.
 */
export function jumpToSection(id: string) {
  const my = ++jumpToken;
  const align = () => {
    const sec = document.getElementById(resolveHash(id)) ?? document.getElementById(id);
    if (!sec) return;
    const focus = focusTarget(sec, id);
    const top = (focus ?? sec).getBoundingClientRect().top - (focus ? FOCUS_TOP : 0);
    if (Math.abs(top) > 2) scrollInstant(top + window.scrollY);
  };
  align();
  for (const ms of [80, 240, 520, 1000, 1800]) {
    window.setTimeout(() => {
      if (jumpToken === my) align();
    }, ms);
  }
}

/** Store side effects of entering a scene. */
export function applyScene(scene: Scene) {
  const st = useSystemStore.getState();
  if (scene.rain3) {
    if (st.dayView !== '72h') st.setDayView('72h');
  } else if (st.dayView === '72h') {
    st.setDayView('24h');
    st.setModeTarget('A');
  }
}

/** R: back to the default system and the first condition (hari terik, 13.00), 24 h view. */
export function resetDemo() {
  const st = useSystemStore.getState();
  st.resetSys();
  if (st.dayView === '72h') st.setDayView('24h');
  st.setModeTarget('A');
}

export function setCondition(mode: 'A' | 'B' | 'C') {
  const st = useSystemStore.getState();
  if (st.dayView === '72h') st.setDayView('24h');
  st.setModeTarget(mode);
}

/** L: open Lab › Rincian. Assumptions.tsx opens and scrolls on the hash. */
export function openLabRincian() {
  const url = `${location.pathname}${location.search}#lab-rincian`;
  if (location.hash !== '#lab-rincian') history.pushState(null, '', url);
  window.dispatchEvent(new HashChangeEvent('hashchange'));
}

/** Drop `presentasi` from the address bar so a reload opens the normal site. */
export function stripPresentationParam() {
  const u = new URL(location.href);
  if (!u.searchParams.has('presentasi')) return;
  u.searchParams.delete('presentasi');
  history.replaceState(null, '', `${u.pathname}${u.search}${u.hash}`);
}
