// @generated — run `yarn icons:build` to update
import type { ComponentProps } from 'react';
import type { IconProps } from '../types';

const Small = (props: ComponentProps<'svg'>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={16}
    height={16}
    fill="none"
    viewBox="0 0 16 16"
    {...props}
  >
    <path
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.2}
      d="M10.667 5.333V4a1.333 1.333 0 0 0-1.334-1.333H4A1.333 1.333 0 0 0 2.667 4v5.333A1.333 1.333 0 0 0 4 10.667h1.333m0-4a1.333 1.333 0 0 1 1.334-1.334H12a1.333 1.333 0 0 1 1.333 1.334V12A1.333 1.333 0 0 1 12 13.333H6.667A1.333 1.333 0 0 1 5.333 12z"
    />
  </svg>
);
const Medium = (props: ComponentProps<'svg'>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={20}
    height={20}
    fill="none"
    viewBox="0 0 20 20"
    {...props}
  >
    <path
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.5}
      d="M13.333 6.667V5a1.667 1.667 0 0 0-1.666-1.667H5A1.667 1.667 0 0 0 3.333 5v6.667A1.667 1.667 0 0 0 5 13.333h1.667m0-5a1.667 1.667 0 0 1 1.666-1.666H15a1.667 1.667 0 0 1 1.667 1.666V15A1.667 1.667 0 0 1 15 16.667H8.333A1.667 1.667 0 0 1 6.667 15z"
    />
  </svg>
);
const Large = (props: ComponentProps<'svg'>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={24}
    height={24}
    fill="none"
    viewBox="0 0 24 24"
    {...props}
  >
    <path
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.5}
      d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2m0-6a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-8a2 2 0 0 1-2-2z"
    />
  </svg>
);

const SIZES = { sm: Small, md: Medium, lg: Large };

const LineCopyIcon = ({
  size = 'md',
  'aria-label': ariaLabel,
  'aria-labelledby': ariaLabelledby,
  ...props
}: IconProps) => {
  const hasAccessibleName = Boolean(ariaLabel?.trim() || ariaLabelledby?.trim());
  const Icon = SIZES[size];

  return (
    <Icon
      aria-hidden={hasAccessibleName ? undefined : true}
      aria-label={ariaLabel}
      aria-labelledby={ariaLabelledby}
      focusable={false}
      role={hasAccessibleName ? 'img' : undefined}
      {...props}
    />
  );
};

export default LineCopyIcon;
