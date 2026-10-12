import { useId, type ReactNode } from 'react';
import { cx } from './cx';

/** Shared SVG diagram helpers. Colour = meaning (see DESIGN_SYSTEM.md): heat = amber, cool/fluid = blue, electric = ink, mute = neutral. */
export type DiagramTone = 'heat' | 'heatSoft' | 'cool' | 'electric' | 'fluid' | 'warm' | 'mute';

export const TONE_CLASS: Record<DiagramTone, { stroke: string; fill: string }> = {
  heat: { stroke: 'stroke-heat-mark', fill: 'fill-heat-mark' },
  heatSoft: { stroke: 'stroke-heat-mark/50', fill: 'fill-heat-mark/50' },
  cool: { stroke: 'stroke-cool', fill: 'fill-cool' },
  electric: { stroke: 'stroke-ink', fill: 'fill-ink' },
  fluid: { stroke: 'stroke-cool', fill: 'fill-cool' },
  warm: { stroke: 'stroke-heat-mark', fill: 'fill-heat-mark' },
  mute: { stroke: 'stroke-ink-3', fill: 'fill-ink-3' },
};

export interface VArrowProps {
  x: number;
  /** Tail y. */
  y1: number;
  /** Head y (arrow points from y1 towards y2). */
  y2: number;
  tone: DiagramTone;
  width?: number;
  head?: number;
  /** Dashed = conditional ("only if the condition is met"). */
  dashed?: boolean;
  /** Gentle nudge animation in the arrow's own direction (reduced-motion safe via CSS). */
  animate?: boolean;
  opacity?: number;
}

/** Straight vertical arrow. */
export function VArrow({ x, y1, y2, tone, width = 2.5, head = 7, dashed, animate, opacity }: VArrowProps) {
  const dir = y2 >= y1 ? 1 : -1;
  const t = TONE_CLASS[tone];
  const baseY = y2 - dir * head * 0.9;
  return (
    <g
      className={animate ? (dir > 0 ? 'fx-nudge-down' : 'fx-nudge-up') : undefined}
      opacity={opacity}
    >
      <line
        x1={x}
        y1={y1}
        x2={x}
        y2={baseY}
        className={t.stroke}
        strokeWidth={width}
        strokeLinecap="round"
        strokeDasharray={dashed ? '5 5' : undefined}
      />
      <polygon points={`${x - head * 0.75},${baseY} ${x + head * 0.75},${baseY} ${x},${y2}`} className={t.fill} />
    </g>
  );
}

/** Small direction chevron, rotated by `angle` degrees (0 = pointing right). */
export function Chevron({ x, y, angle, tone = 'fluid' }: { x: number; y: number; angle: number; tone?: DiagramTone }) {
  return (
    <path
      d="M-4 -4.5 L2.5 0 L-4 4.5"
      transform={`translate(${x} ${y}) rotate(${angle})`}
      fill="none"
      className={TONE_CLASS[tone].stroke}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  );
}

/** Stable, selector-safe id for gradients/patterns inside one SVG. */
export function useSvgId(prefix: string): string {
  return `${prefix}${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
}

/** Legend key: 8×8 square (or 16×2 line) drawn as the actual encoding, label 12 px ink-2. */
export function Swatch({ className, label, line }: { className: string; label: ReactNode; line?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2 text-label text-ink-2">
      <span aria-hidden="true" className={cx(line ? 'h-0.5 w-4 rounded-xs' : 'size-2 rounded-xs', className)} />
      {label}
    </span>
  );
}
