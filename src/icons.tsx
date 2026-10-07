// One icon family: 24px grid, 1.75 stroke, square caps. Decorative (aria-hidden); buttons carry the label.
import type { SVGProps } from 'react';

function Icon({ children, ...rest }: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="1em"
      height="1em"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="square"
      strokeLinejoin="miter"
      aria-hidden="true"
      focusable="false"
      {...rest}
    >
      {children}
    </svg>
  );
}

export const PlusIcon = () => (
  <Icon>
    <path d="M12 5v14M5 12h14" />
  </Icon>
);

export const CloseIcon = () => (
  <Icon>
    <path d="M6 6l12 12M18 6L6 18" />
  </Icon>
);

export const BackIcon = () => (
  <Icon>
    <path d="M15 5l-7 7 7 7" />
  </Icon>
);

export const SearchIcon = () => (
  <Icon>
    <circle cx="10.5" cy="10.5" r="6" />
    <path d="M15 15l5 5" />
  </Icon>
);

/** A d20 seen face-on: hexagon outline with the inner triangle. */
export const D20Icon = () => (
  <Icon>
    <path d="M12 2.5l8.5 4.9v9.2L12 21.5l-8.5-4.9V7.4z" />
    <path d="M12 7l4.5 8h-9z" />
    <path d="M12 2.5V7M3.5 7.4L7.5 15M20.5 7.4L16.5 15M7.5 15L12 21.5 16.5 15" />
  </Icon>
);

export const MoonIcon = () => (
  <Icon>
    <path d="M20 14.5A8 8 0 019.5 4a8 8 0 1010.5 10.5z" />
  </Icon>
);

export const CampfireIcon = () => (
  <Icon>
    <path d="M12 3c2.5 3 4 5 4 7.5a4 4 0 01-8 0C8 9 9 8 10 7c0 1.5.8 2.5 2 3 0-2.5-.5-4.5 0-7z" />
    <path d="M4 20l16-3M4 17l16 3" />
  </Icon>
);

/** Crossed swords, for weapon attacks. */
export const SwordsIcon = () => (
  <Icon>
    <path d="M4 4l11 11M15 15l2 2M17 13l-4 4M19 19l1 1" />
    <path d="M20 4L9 15M9 15l-2 2M7 13l4 4M5 19l-1 1" />
  </Icon>
);

export const TrashIcon = () => (
  <Icon>
    <path d="M4 7h16M9 7V4h6v3M6.5 7l1 13h9l1-13M10 11v6M14 11v6" />
  </Icon>
);
