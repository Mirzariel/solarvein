/**
 * Class/inline-style constants for the DOM chrome that sits ON the dark stage.
 * They read the semantic stage tokens (`--color-stage-*`, owned by the Design Systems agent) and fall back to
 * the art-direction values from docs/audit/05-creative-direction.md 4.1, so the chrome renders correctly
 * before and after the token rebuild lands. Full literal strings so Tailwind can see them.
 */
export const INK = 'text-[color:var(--color-stage-ink,#E9ECEE)]';
export const INK2 = 'text-[color:var(--color-stage-ink-2,#8D979F)]';
export const LINE_BORDER = 'border-[color:var(--color-stage-line,#262C33)]';
export const SHADOW_TEXT = '[text-shadow:0_0_6px_var(--color-stage-0,#0E1114),0_0_2px_var(--color-stage-0,#0E1114)]';
export const FOCUS_RING =
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--color-stage-ink,#E9ECEE)]';

/** SVG stroke/fill via inline style (works with var fallbacks). */
export const SVG_INK = 'var(--color-stage-ink, #E9ECEE)';
export const SVG_INK2 = 'var(--color-stage-ink-2, #8D979F)';
export const SVG_BG = 'var(--color-stage-0, #0E1114)';

/** Stage icon button (32 px desktop, 44 px touch). */
export const BTN =
  'pointer-events-auto inline-flex h-8 min-w-8 items-center justify-center gap-1.5 rounded-lg border px-2 text-xs font-medium whitespace-nowrap ' +
  'transition-[background-color,color,transform] duration-150 ease-[cubic-bezier(0.22,1,0.36,1)] active:scale-[0.98] max-sm:h-11 max-sm:min-w-11 ' +
  'border-[color:var(--color-stage-line,#262C33)] text-[color:var(--color-stage-ink-2,#8D979F)] ' +
  'bg-[rgba(14,17,20,0.5)] hover:bg-[rgba(233,236,238,0.08)] hover:text-[color:var(--color-stage-ink,#E9ECEE)] ' +
  'aria-pressed:bg-[rgba(233,236,238,0.12)] aria-pressed:text-[color:var(--color-stage-ink,#E9ECEE)] ' +
  'aria-expanded:bg-[rgba(233,236,238,0.12)] aria-expanded:text-[color:var(--color-stage-ink,#E9ECEE)] ' +
  FOCUS_RING;
