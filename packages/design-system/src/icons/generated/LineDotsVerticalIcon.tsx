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
      fill="currentColor"
      d="M7.334 8a.667.667 0 1 0 1.333 0 .667.667 0 0 0-1.333 0M7.334 12.666a.667.667 0 1 0 1.333 0 .667.667 0 0 0-1.333 0M7.334 3.333a.667.667 0 1 0 1.333 0 .667.667 0 0 0-1.333 0"
    />
    <path
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.2}
      d="M7.334 8a.667.667 0 1 0 1.333 0 .667.667 0 0 0-1.333 0m0 4.666a.667.667 0 1 0 1.333 0 .667.667 0 0 0-1.333 0m0-9.333a.667.667 0 1 0 1.333 0 .667.667 0 0 0-1.333 0"
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
      fill="currentColor"
      d="M9.166 10a.833.833 0 1 0 1.667 0 .833.833 0 0 0-1.667 0M9.166 15.834a.833.833 0 1 0 1.666 0 .833.833 0 0 0-1.666 0M9.166 4.167a.833.833 0 1 0 1.667 0 .833.833 0 0 0-1.667 0"
    />
    <path
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.5}
      d="M9.166 10a.833.833 0 1 0 1.667 0 .833.833 0 0 0-1.667 0m0 5.834a.833.833 0 1 0 1.666 0 .833.833 0 0 0-1.666 0m0-11.667a.833.833 0 1 0 1.667 0 .833.833 0 0 0-1.667 0"
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
      fill="currentColor"
      d="M11 12a1 1 0 1 0 2 0 1 1 0 0 0-2 0M11 19a1 1 0 1 0 2 0 1 1 0 0 0-2 0M11 5a1 1 0 1 0 2 0 1 1 0 0 0-2 0"
    />
    <path
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.5}
      d="M11 12a1 1 0 1 0 2 0 1 1 0 0 0-2 0m0 7a1 1 0 1 0 2 0 1 1 0 0 0-2 0m0-14a1 1 0 1 0 2 0 1 1 0 0 0-2 0"
    />
  </svg>
);

const SIZES = { sm: Small, md: Medium, lg: Large };

const LineDotsVerticalIcon = ({
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

export default LineDotsVerticalIcon;
