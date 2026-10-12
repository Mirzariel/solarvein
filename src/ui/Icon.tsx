import type { ReactNode, SVGProps } from 'react';

export interface IconProps extends Omit<SVGProps<SVGSVGElement>, 'children'> {
  /** Pixel size (width = height). Default 16 (bare, stroke 1.5, never in a box). */
  size?: number;
  /** If given, the icon is exposed to assistive tech with this name; otherwise it is decorative (aria-hidden). */
  title?: string;
}

function make(name: string, paths: ReactNode) {
  const C = ({ size = 16, title, ...rest }: IconProps) => (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      role={title ? 'img' : undefined}
      aria-hidden={title ? undefined : true}
      aria-label={title}
      focusable="false"
      {...rest}
    >
      {title ? <title>{title}</title> : null}
      {paths}
    </svg>
  );
  C.displayName = name;
  return C;
}

export const SunIcon = make(
  'SunIcon',
  <>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2.5v2.5M12 19v2.5M2.5 12H5M19 12h2.5M5.3 5.3l1.8 1.8M16.9 16.9l1.8 1.8M5.3 18.7l1.8-1.8M16.9 7.1l1.8-1.8" />
  </>,
);

export const CloudIcon = make('CloudIcon', <path d="M7 18a4 4 0 0 1-.6-7.96A5.5 5.5 0 0 1 17 8.6 4.7 4.7 0 0 1 17 18H7Z" />);

export const RainIcon = make(
  'RainIcon',
  <>
    <path d="M7 14a4 4 0 0 1-.6-7.96A5.5 5.5 0 0 1 17 4.6 4.7 4.7 0 0 1 17 14H7Z" />
    <path d="M8 17.5l-1 2.5M12.5 17.5l-1 2.5M17 17.5l-1 2.5" />
  </>,
);

export const DropletIcon = make('DropletIcon', <path d="M12 3.2c3.2 3.9 5.5 6.9 5.5 10a5.5 5.5 0 0 1-11 0c0-3.1 2.3-6.1 5.5-10Z" />);

export const FlowIcon = make(
  'FlowIcon',
  <>
    <path d="M3 8h9a3 3 0 0 1 0 6H7" />
    <path d="M3 16h14" />
    <path d="M14.5 13.5 17 16l-2.5 2.5" />
    <path d="M18 8h3" />
  </>,
);

export const BoltIcon = make('BoltIcon', <path d="M13 2.5 5 13.5h6l-1 8 8-11h-6l1-8Z" />);

export const ThermometerIcon = make(
  'ThermometerIcon',
  <>
    <path d="M10 14.2V5a2 2 0 1 1 4 0v9.2a4 4 0 1 1-4 0Z" />
    <path d="M12 9v7" />
  </>,
);

export type ArrowDirection = 'up' | 'down' | 'left' | 'right';
const ROTATE: Record<ArrowDirection, number> = { right: 0, down: 90, left: 180, up: 270 };

export function ArrowIcon({ direction = 'right', size = 16, title, ...rest }: IconProps & { direction?: ArrowDirection }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      role={title ? 'img' : undefined}
      aria-hidden={title ? undefined : true}
      aria-label={title}
      focusable="false"
      {...rest}
    >
      {title ? <title>{title}</title> : null}
      <g transform={`rotate(${ROTATE[direction]} 12 12)`}>
        <path d="M4 12h15M13 6l6 6-6 6" />
      </g>
    </svg>
  );
}

export const LayersIcon = make(
  'LayersIcon',
  <>
    <path d="m12 3 9 4.5-9 4.5-9-4.5L12 3Z" />
    <path d="m3 12 9 4.5 9-4.5" />
    <path d="m3 16.5 9 4.5 9-4.5" />
  </>,
);

export const CrossSectionIcon = make(
  'CrossSectionIcon',
  <>
    <rect x="3" y="5" width="18" height="14" rx="1.5" />
    <path d="M3 9h18M3 13h18" />
    <path d="M7 16.2h10" strokeDasharray="1.5 2.5" />
  </>,
);

export const ExplodeIcon = make(
  'ExplodeIcon',
  <>
    <path d="m12 2.5 6.5 3-6.5 3-6.5-3 6.5-3Z" />
    <path d="m12 10.5 6.5 3-6.5 3-6.5-3 6.5-3Z" />
    <path d="M12 18.5v3M9.5 20l2.5 2 2.5-2" />
  </>,
);

export const ResetIcon = make(
  'ResetIcon',
  <>
    <path d="M4 12a8 8 0 1 0 2.6-5.9" />
    <path d="M4 4v4.5h4.5" />
  </>,
);

export const InfoIcon = make(
  'InfoIcon',
  <>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 11v5.5" />
    <path d="M12 7.6v.01" strokeWidth={2} />
  </>,
);

export const PumpIcon = make(
  'PumpIcon',
  <>
    <circle cx="12" cy="12" r="7.5" />
    <path d="M12 4.5 18.2 9.8M12 19.5l6.2-5.3" />
    <path d="M2.5 12H4.5M19.5 12h2" />
  </>,
);

export const CheckIcon = make('CheckIcon', <path d="m5 12.5 4.5 4.5L19 7.5" />);
export const CloseIcon = make('CloseIcon', <path d="M6 6l12 12M18 6 6 18" />);
export const MenuIcon = make('MenuIcon', <path d="M4 7h16M4 12h16M4 17h16" />);
export const WarningIcon = make(
  'WarningIcon',
  <>
    <path d="M12 3.5 21.5 20h-19L12 3.5Z" />
    <path d="M12 10v4.5" />
    <path d="M12 17.4v.01" strokeWidth={2} />
  </>,
);

export const PlusIcon = make('PlusIcon', <path d="M12 5v14M5 12h14" />);
export const MinusIcon = make('MinusIcon', <path d="M5 12h14" />);
export const MaximizeIcon = make('MaximizeIcon', <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" />);
export const ExternalIcon = make('ExternalIcon', <path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" />);

export type ChevronDirection = 'up' | 'down' | 'left' | 'right';
const CHEVRON_ROTATE: Record<ChevronDirection, number> = { down: 0, left: 90, up: 180, right: 270 };

/** Chevron; `direction` is where it points. Rotate the element itself (CSS transform) when animating. */
export function ChevronIcon({ direction = 'down', size = 16, title, ...rest }: IconProps & { direction?: ChevronDirection }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      role={title ? 'img' : undefined}
      aria-hidden={title ? undefined : true}
      aria-label={title}
      focusable="false"
      {...rest}
    >
      {title ? <title>{title}</title> : null}
      <g transform={`rotate(${CHEVRON_ROTATE[direction]} 12 12)`}>
        <path d="m6 9 6 6 6-6" />
      </g>
    </svg>
  );
}

/** Name → component map for data-driven UI. */
export const Icons = {
  sun: SunIcon,
  cloud: CloudIcon,
  rain: RainIcon,
  droplet: DropletIcon,
  flow: FlowIcon,
  bolt: BoltIcon,
  thermometer: ThermometerIcon,
  arrow: ArrowIcon,
  layers: LayersIcon,
  crossSection: CrossSectionIcon,
  explode: ExplodeIcon,
  reset: ResetIcon,
  info: InfoIcon,
  pump: PumpIcon,
  check: CheckIcon,
  close: CloseIcon,
  menu: MenuIcon,
  warning: WarningIcon,
  plus: PlusIcon,
  minus: MinusIcon,
  maximize: MaximizeIcon,
  external: ExternalIcon,
  chevron: ChevronIcon,
} as const;
export type IconName = keyof typeof Icons;

