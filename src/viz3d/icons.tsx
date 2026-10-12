/**
 * Tiny local icon set for the stage chrome (16 px, stroke 1.5, round joins, currentColor) so the 3D chrome does
 * not depend on the page icon set while it is being restyled.
 */
import type { ReactNode } from 'react';

function Svg({ children, size = 16 }: { children: ReactNode; size?: number }) {
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
      aria-hidden="true"
      focusable="false"
    >
      {children}
    </svg>
  );
}

export const IconReset = ({ size }: { size?: number }) => (
  <Svg size={size}>
    <path d="M4 12a8 8 0 1 0 2.6-5.9" />
    <path d="M4 4.5v4.6h4.6" />
  </Svg>
);

export const IconPlus = ({ size }: { size?: number }) => (
  <Svg size={size}>
    <path d="M12 5v14M5 12h14" />
  </Svg>
);

export const IconMinus = ({ size }: { size?: number }) => (
  <Svg size={size}>
    <path d="M5 12h14" />
  </Svg>
);

export const IconExplode = ({ size }: { size?: number }) => (
  <Svg size={size}>
    <path d="m12 3 8 3.4-8 3.4-8-3.4L12 3Z" />
    <path d="m4 12.2 8 3.4 8-3.4" />
    <path d="m4 17.6 8 3.4 8-3.4" />
  </Svg>
);

export const IconSection = ({ size }: { size?: number }) => (
  <Svg size={size}>
    <rect x="4" y="5" width="16" height="14" rx="1.5" />
    <path d="M4 12h16" strokeDasharray="2.5 2.5" />
    <path d="M8 15.5h8" />
  </Svg>
);

export const IconLayers = ({ size }: { size?: number }) => (
  <Svg size={size}>
    <path d="m12 4 8.5 4.2L12 12.4 3.5 8.2 12 4Z" />
    <path d="m3.5 12.2 8.5 4.2 8.5-4.2" />
    <path d="m3.5 16.2 8.5 4.2 8.5-4.2" />
  </Svg>
);

export const IconChevronDown = ({ size }: { size?: number }) => (
  <Svg size={size}>
    <path d="m6 9 6 6 6-6" />
  </Svg>
);

export const IconInfo = ({ size }: { size?: number }) => (
  <Svg size={size}>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M12 11v5M12 8v.01" />
  </Svg>
);
