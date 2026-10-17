/**
 * Presentation key map. Pure: resolveKey turns (key, modifiers, focus target) into an action or null.
 * Keys are ignored while focus is in a text field or slider (never fight the sliders); Esc there only releases focus.
 */
export type PresentationAction =
  | { type: 'step'; delta: 1 | -1 }
  | { type: 'jump'; index: number }
  | { type: 'top' }
  | { type: 'reset' }
  | { type: 'lab' }
  | { type: 'mode'; mode: 'A' | 'B' | 'C' }
  | { type: 'hints' }
  | { type: 'exit' }
  | { type: 'release-focus' };

export interface KeyInfo {
  key: string;
  ctrl?: boolean;
  alt?: boolean;
  meta?: boolean;
  shift?: boolean;
}

export interface TargetInfo {
  tag: string;
  role: string;
  /** contentEditable or an input / textarea / select. */
  typing: boolean;
}

const HOLD_FOCUS_ROLES = new Set(['slider', 'spinbutton', 'textbox', 'combobox', 'listbox', 'searchbox']);
const COMPOSITE_ROLES = new Set(['radio', 'tab', 'menuitem', 'menuitemradio', 'option']);
const ACTIVATE_TAGS = new Set(['button', 'a', 'summary']);
const ACTIVATE_ROLES = new Set(['button', 'switch', 'checkbox', 'radio', 'tab', 'link']);

export function describeTarget(el: EventTarget | null): TargetInfo {
  const e = el as HTMLElement | null;
  if (!e || typeof e.tagName !== 'string') return { tag: '', role: '', typing: false };
  const tag = e.tagName.toLowerCase();
  const typing = tag === 'input' || tag === 'textarea' || tag === 'select' || e.isContentEditable === true;
  return { tag, role: (e.getAttribute?.('role') ?? '').toLowerCase(), typing };
}

export function resolveKey(k: KeyInfo, t: TargetInfo, sceneCount: number): PresentationAction | null {
  if (k.ctrl || k.alt || k.meta) return null;
  const holdsFocus = t.typing || HOLD_FOCUS_ROLES.has(t.role);
  if (k.key === 'Escape') return holdsFocus ? { type: 'release-focus' } : { type: 'exit' };
  if (holdsFocus) return null;

  const key = k.key.length === 1 ? k.key.toLowerCase() : k.key;
  switch (key) {
    case 'ArrowRight':
    case 'ArrowLeft':
      if (COMPOSITE_ROLES.has(t.role)) return null; // arrows move inside radio groups and tab lists
      return { type: 'step', delta: key === 'ArrowRight' ? 1 : -1 };
    case 'PageDown':
      return { type: 'step', delta: 1 };
    case 'PageUp':
      return { type: 'step', delta: -1 };
    case ' ':
      if (ACTIVATE_TAGS.has(t.tag) || ACTIVATE_ROLES.has(t.role)) return null; // Space activates the focused control
      return { type: 'step', delta: k.shift ? -1 : 1 };
    case 'Home':
    case '0':
      return { type: 'top' };
    case 'r':
      return { type: 'reset' };
    case 'l':
      return { type: 'lab' };
    case 'a':
    case 'b':
    case 'c':
      return { type: 'mode', mode: key.toUpperCase() as 'A' | 'B' | 'C' };
    case 'h':
    case '?':
      return { type: 'hints' };
    default:
      if (/^[1-9]$/.test(key)) {
        const index = Number(key) - 1;
        return index < sceneCount ? { type: 'jump', index } : null;
      }
      return null;
  }
}
