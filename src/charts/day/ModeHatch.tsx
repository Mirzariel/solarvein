import { useId } from 'react';
import type { ControllerMode } from '../../sim/system';

/**
 * Mode bands carry no hue (colour is reserved for the medium): A = dense diagonal, B = dots, C = horizontal rules.
 * `modeFill(uid, mode)` returns the paint for a rect; render <ModeHatchDefs uid /> once per SVG.
 */
export const useHatchId = (): string => `hx${useId().replace(/[^a-zA-Z0-9]/g, '')}`;

export const modeFill = (uid: string, mode: ControllerMode): string => `url(#${uid}-${mode})`;

export function ModeHatchDefs({ uid }: { uid: string }) {
  return (
    <defs>
      <pattern id={`${uid}-A`} width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
        <rect width="5" height="5" fill="var(--color-paper)" />
        <line x1="0" y1="0" x2="0" y2="5" stroke="var(--color-ink-3)" strokeWidth="1.2" />
      </pattern>
      <pattern id={`${uid}-B`} width="6" height="6" patternUnits="userSpaceOnUse">
        <rect width="6" height="6" fill="var(--color-paper)" />
        <circle cx="3" cy="3" r="1" fill="var(--color-ink-3)" />
      </pattern>
      <pattern id={`${uid}-C`} width="6" height="5" patternUnits="userSpaceOnUse">
        <rect width="6" height="5" fill="var(--color-paper)" />
        <line x1="0" y1="2.5" x2="6" y2="2.5" stroke="var(--color-line-strong)" strokeWidth="1" />
      </pattern>
    </defs>
  );
}

/** 14 px key for the legend (the actual encoding, drawn small). */
export function ModeSwatch({ mode, size = 14 }: { mode: ControllerMode; size?: number }) {
  const uid = useHatchId();
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true" className="shrink-0">
      <ModeHatchDefs uid={uid} />
      <rect x=".5" y=".5" width={size - 1} height={size - 1} rx="2" fill={modeFill(uid, mode)} stroke="var(--color-ink-3)" strokeWidth="1" />
    </svg>
  );
}
