/**
 * Presentation controller: DOM + store side effects (no React). Pure decisions live in keys.ts / scenes.ts / preset.ts.
 */
import { getLenis } from '../motion/smoothScroll';
import { resolveHash } from '../sections/nav';
import { useSystemStore, type SystemState } from '../state/system';
import type { DayScenarioId, ModeTarget } from '../sim/system';
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

/**
 * The presenter's condition (scenario, hour, A/B/C, day view). Scrolling THROUGH other sections changes the store on its
 * own (the pinned Cara kerja scene sets A/B/C from scroll progress), so ?skenario=malam would be lost on the way to
 * Sehari. After a jump the condition is put back, except when the destination is Cara kerja itself.
 */
type Condition = Pick<SystemState, 'scenario' | 'hour' | 'modeTarget' | 'dayView'>;
const pick = (s: SystemState): Condition => ({ scenario: s.scenario, hour: s.hour, modeTarget: s.modeTarget, dayView: s.dayView });
let intended: Condition | null = null;
/** While now < holdUntil and `holding`, a store change that deviates from `intended` is undone at once. */
let holdUntil = 0;
let holding = false;

const same = (a: Condition, b: Condition) => a.scenario === b.scenario && a.hour === b.hour && a.modeTarget === b.modeTarget && a.dayView === b.dayView;

/** Remember the current store condition as the presenter's (call after every presenter action). */
export function captureCondition() {
  intended = pick(useSystemStore.getState());
}

/** Put the presenter's condition back (e.g. after a detour through Cara kerja, whose pinned scene sets A/B/C by scroll). */
export function restoreIntended() {
  if (intended && !same(pick(useSystemStore.getState()), intended)) useSystemStore.setState({ ...intended });
}

/** Presenter actions end any running hold first (their own store changes are intended). */
export function releaseHold() {
  holding = false;
  holdUntil = 0;
}

/** Follow presenter changes (UI clicks, sliders), and undo scroll-driven changes inside a hold window. */
export function trackCondition(): () => void {
  captureCondition();
  return useSystemStore.subscribe((s) => {
    if (performance.now() < holdUntil) {
      // inside a jump window: scroll-driven changes are not the presenter's
      if (holding && intended && !same(pick(s), intended)) useSystemStore.setState({ ...intended });
      return;
    }
    holding = false;
    intended = pick(s);
  });
}

/** For `ms` after a jump, keep the presenter's condition against section scroll effects (not when Cara kerja is the target). */
function holdCondition(ms: number, hold = true) {
  holding = hold;
  holdUntil = performance.now() + ms;
}

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
  // Set BEFORE the first scroll: ScrollTrigger scenes (Cara kerja) react synchronously. Router decides A/B/C itself when it is the destination.
  holdCondition(2300, resolveHash(id) !== 'router');
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

/** Condition to restore when the 3-day rain backup is left (so ?skenario=malam survives a detour through scene 9). */
let beforeRain: { scenario: DayScenarioId; hour: number; modeTarget: ModeTarget | 'custom' } | null = null;

function leaveRain() {
  const st = useSystemStore.getState();
  if (st.dayView !== '72h') return;
  const saved = beforeRain;
  beforeRain = null;
  st.setDayView('24h');
  if (!saved) return st.setModeTarget('A');
  if (saved.modeTarget !== 'custom') return st.setModeTarget(saved.modeTarget);
  st.setScenario(saved.scenario);
  st.setHour(saved.hour);
}

/**
 * Store side effects of entering a scene. The condition (A/B/C or ?skenario) is left alone, except that the 3-day
 * rain backup switches to the 72 h view and any other scene switches back and restores the condition from before.
 */
export function applyScene(scene: Scene) {
  const st = useSystemStore.getState();
  if (scene.rain3) {
    if (st.dayView !== '72h') {
      beforeRain = { scenario: st.scenario, hour: st.hour, modeTarget: st.modeTarget };
      st.setDayView('72h');
    }
  } else {
    leaveRain();
  }
}

/** R: back to the default system and the first condition (hari terik, 13.00), 24 h view. */
export function resetDemo() {
  beforeRain = null;
  const st = useSystemStore.getState();
  st.resetSys();
  if (st.dayView === '72h') st.setDayView('24h');
  st.setModeTarget('A');
}

export function setCondition(mode: 'A' | 'B' | 'C') {
  beforeRain = null;
  const st = useSystemStore.getState();
  if (st.dayView === '72h') st.setDayView('24h');
  st.setModeTarget(mode);
}

/** Home / 0: the opening. Leaves the 72 h view like any other scene. */
export function leaveRainView() {
  leaveRain();
}

/** Drop a leftover `#lab-rincian` (or any hash) without a navigation, so Home and scene jumps leave a clean URL. */
export function clearHash() {
  if (!location.hash) return;
  history.replaceState(null, '', `${location.pathname}${location.search}`);
}

/** L: open Lab › Rincian. Assumptions.tsx opens and scrolls on the hash. */
export function openLabRincian() {
  jumpToken++;
  holdCondition(4200);
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
