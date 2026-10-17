/**
 * Diagram colours by medium (sv-visual-identity): heat in the liquid = amber, electricity = ink, bypass = grey,
 * `cool` only for dehumidified supply air, regeneration exhaust = ink-2. `page` reads the site tokens;
 * `paper` is the export variant with literal values so a serialised SVG renders anywhere.
 */
export interface Palette {
  paper: string;
  ink: string;
  ink2: string;
  ink3: string;
  tick: string;
  line: string;
  lineStrong: string;
  /** Large fills (bands). */
  heat: string;
  /** Marks, dots, thin lines. */
  heatMark: string;
  /** Text. */
  heatInk: string;
  cool: string;
  coolInk: string;
  loss: string;
  mono: string;
  sans: string;
}

export type DiagramTone = 'page' | 'paper';

const MONO_STACK = "'Geist Mono Variable', 'Geist Mono', ui-monospace, 'Cascadia Mono', monospace";
const SANS_STACK = "'Geist Variable', Geist, ui-sans-serif, system-ui, 'Segoe UI', sans-serif";

export const PALETTES: Record<DiagramTone, Palette> = {
  page: {
    paper: 'var(--color-paper, #f6f5f2)',
    ink: 'var(--color-ink, #111214)',
    ink2: 'var(--color-ink-2, #5d6066)',
    ink3: 'var(--color-ink-3, #696c72)',
    tick: 'var(--color-tick, #96989c)',
    line: 'var(--color-line, #e4e2dd)',
    lineStrong: 'var(--color-line-strong, #cfccc5)',
    heat: 'var(--color-heat, #d98442)',
    heatMark: 'var(--color-heat-mark, #c4702d)',
    heatInk: 'var(--color-heat-ink, #a8561a)',
    cool: 'var(--color-cool, #398bae)',
    coolInk: 'var(--color-cool-ink, #1f6785)',
    loss: 'var(--color-loss, #b8c0c6)',
    mono: `var(--font-mono, ${MONO_STACK})`,
    sans: `var(--font-sans, ${SANS_STACK})`,
  },
  paper: {
    paper: '#f6f5f2',
    ink: '#111214',
    ink2: '#5d6066',
    ink3: '#696c72',
    tick: '#96989c',
    line: '#e4e2dd',
    lineStrong: '#cfccc5',
    heat: '#d98442',
    heatMark: '#c4702d',
    heatInk: '#a8561a',
    cool: '#398bae',
    coolInk: '#1f6785',
    loss: '#b8c0c6',
    mono: MONO_STACK,
    sans: SANS_STACK,
  },
};
