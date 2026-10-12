import type { HTMLAttributes } from 'react';
import { cx } from './cx';

export interface PanelProps extends HTMLAttributes<HTMLElement> {
  as?: 'div' | 'section' | 'article' | 'aside' | 'figure';
  /** default: white surface; raised/inset: recessed `sunken` wash. */
  tone?: 'default' | 'raised' | 'inset';
  padded?: boolean;
}

const TONE = {
  default: 'bg-surface',
  raised: 'bg-sunken',
  inset: 'bg-sunken',
} as const;

/**
 * The one allowed container: groups controls with their outputs (the Lab rig). White, 1 px line, radius 12.
 * Never nest a Panel in a Panel; no shadow.
 */
export function Panel({ as: Tag = 'div', tone = 'default', padded = true, className, children, ...rest }: PanelProps) {
  return (
    <Tag className={cx('rounded-md border border-line', TONE[tone], padded && 'p-4 sm:p-6', className)} {...rest}>
      {children}
    </Tag>
  );
}
