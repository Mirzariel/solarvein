import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from 'react';
import { cx } from './cx';
import { Tooltip, type TooltipSide } from './Tooltip';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'stage';
/** `sm` = 32 px, `md` = 40 px. `lg` is accepted for old call sites and renders as `md`. */
export type ButtonSize = 'sm' | 'md' | 'lg';

const VARIANT: Record<ButtonVariant, string> = {
  primary: 'bg-ink text-surface border border-transparent hover:bg-ink/85 active:scale-[0.98] active:bg-ink/75',
  secondary: 'bg-surface text-ink border border-line-strong hover:bg-sunken active:scale-[0.98] active:bg-line',
  ghost: 'bg-transparent text-ink-2 border border-transparent hover:bg-sunken hover:text-ink active:scale-[0.98] active:bg-line',
  stage:
    'bg-transparent text-stage-ink border border-stage-line hover:bg-stage-ink/[0.06] active:scale-[0.98] active:bg-stage-ink/10 focus-visible:outline-stage-ink',
};
const SIZE: Record<ButtonSize, string> = {
  sm: 'min-h-9 rounded-full px-4 gap-2 pointer-coarse:min-h-11',
  md: 'min-h-11 rounded-full px-5 gap-2 pointer-coarse:min-h-11',
  lg: 'min-h-12 rounded-full px-6 gap-2 pointer-coarse:min-h-12',
};
const BASE =
  'inline-flex items-center justify-center text-button whitespace-nowrap transition-ui disabled:cursor-not-allowed disabled:opacity-40 aria-disabled:cursor-not-allowed aria-disabled:opacity-40';

interface Common {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: ReactNode;
  iconRight?: ReactNode;
}

export type ButtonProps = Common & ButtonHTMLAttributes<HTMLButtonElement>;

/** Primary (ink) · secondary (outline) · ghost · stage (on the dark 3D stage). Max one primary per viewport. */
export function Button({ variant = 'secondary', size = 'md', icon, iconRight, className, children, type = 'button', ...rest }: ButtonProps) {
  return (
    <button type={type} className={cx(BASE, VARIANT[variant], SIZE[size], className)} {...rest}>
      {icon}
      {children}
      {iconRight}
    </button>
  );
}

export type ButtonLinkProps = Common & AnchorHTMLAttributes<HTMLAnchorElement>;

/** Same look as Button, rendered as an anchor (in-page navigation, external links). */
export function ButtonLink({ variant = 'secondary', size = 'md', icon, iconRight, className, children, ...rest }: ButtonLinkProps) {
  return (
    <a className={cx(BASE, VARIANT[variant], SIZE[size], className)} {...rest}>
      {icon}
      {children}
      {iconRight}
    </a>
  );
}

export interface IconButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'aria-label' | 'children'> {
  /** Required accessible name (also the tooltip text). */
  label: string;
  /** The bare 16 px icon. */
  children: ReactNode;
  variant?: ButtonVariant;
  /** 32 or 40 px square. */
  size?: 'sm' | 'md';
  /** Toggle state (view toggles): renders as pressed. */
  pressed?: boolean;
  /** Tooltip with the label (default true). */
  tooltip?: boolean;
  tooltipSide?: TooltipSide;
}

/** Square icon-only button, 32/40 px (44 hit area on coarse pointers). */
export function IconButton({
  label,
  children,
  variant = 'ghost',
  size = 'sm',
  pressed,
  tooltip = true,
  tooltipSide = 'bottom',
  className,
  type = 'button',
  ...rest
}: IconButtonProps) {
  const stage = variant === 'stage';
  const btn = (
    <button
      type={type}
      aria-label={label}
      aria-pressed={pressed}
      className={cx(
        BASE,
        VARIANT[variant],
        size === 'sm' ? 'size-8 rounded-sm pointer-coarse:size-11' : 'size-10 rounded-md pointer-coarse:size-11',
        pressed && (stage ? 'bg-stage-ink/10 text-stage-ink' : 'bg-sunken text-ink'),
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  );
  return tooltip ? (
    <Tooltip content={label} side={tooltipSide} tone={stage ? 'stage' : 'page'}>
      {btn}
    </Tooltip>
  ) : (
    btn
  );
}
