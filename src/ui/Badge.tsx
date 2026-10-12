import type { ReactNode } from 'react';
import { cx } from './cx';

export type Tone = 'heat' | 'cool' | 'neutral' | 'warning' | 'critical';

const DOT: Record<Tone, string> = {
  heat: 'bg-heat-mark',
  cool: 'bg-cool',
  neutral: 'bg-ink-3',
  warning: 'bg-heat-mark',
  critical: 'bg-critical',
};
const DOT_STAGE: Record<Tone, string> = {
  heat: 'bg-stage-heat',
  cool: 'bg-stage-cool',
  neutral: 'bg-stage-ink-2',
  warning: 'bg-stage-heat',
  critical: 'bg-critical',
};

export interface StatusDotProps {
  tone?: Tone;
  children: ReactNode;
  /** Announce changes to screen readers (role="status"). Use for live regime indicators. */
  live?: boolean;
  /** Gently pulse the dot (a running state). Respects reduced motion. */
  pulse?: boolean;
  /** `stage` on the dark 3D stage. */
  surface?: 'page' | 'stage';
  className?: string;
}

/**
 * Inline text status with a 6 px dot: `● Panen panas`. Not a pill: no border, no fill.
 * Colour is never the only carrier of meaning: always include text.
 */
export function StatusDot({ tone = 'neutral', children, live, pulse, surface = 'page', className }: StatusDotProps) {
  return (
    <span
      role={live ? 'status' : undefined}
      className={cx('inline-flex items-center gap-2 text-label', surface === 'stage' ? 'text-stage-ink' : 'text-ink', className)}
    >
      <span
        aria-hidden="true"
        className={cx('size-1.5 shrink-0 rounded-full', (surface === 'stage' ? DOT_STAGE : DOT)[tone], pulse && 'fx-pulse')}
      />
      {children}
    </span>
  );
}

export interface BadgeProps {
  tone?: Tone;
  icon?: ReactNode;
  children: ReactNode;
  className?: string;
}

/** @deprecated Compat alias: renders `StatusDot` (no pill). The `icon` is dropped. */
export function Badge({ tone = 'neutral', children, className }: BadgeProps) {
  return (
    <StatusDot tone={tone} className={className}>
      {children}
    </StatusDot>
  );
}

export interface StatusPillProps {
  tone?: Tone;
  children: ReactNode;
  live?: boolean;
  pulse?: boolean;
  className?: string;
}

/** @deprecated Compat alias: renders `StatusDot` (no pill). */
export function StatusPill(props: StatusPillProps) {
  return <StatusDot {...props} />;
}
