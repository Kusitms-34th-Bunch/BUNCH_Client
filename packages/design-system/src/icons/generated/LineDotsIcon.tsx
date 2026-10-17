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
      d="M2.666 8a.667.667 0 1 0 1.333 0 .667.667 0 0 0-1.333 0M7.333 8a.667.667 0 1 0 1.333 0 .667.667 0 0 0-1.333 0M12 8a.667.667 0 1 0 1.333 0 .667.667 0 0 0-1.334 0"
    />
    <path
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.2}
      d="M2.666 8a.667.667 0 1 0 1.333 0 .667.667 0 0 0-1.333 0m4.667 0a.667.667 0 1 0 1.333 0 .667.667 0 0 0-1.333 0m4.666 0a.667.667 0 1 0 1.334 0 .667.667 0 0 0-1.334 0"
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
      d="M3.334 10a.833.833 0 1 0 1.667 0 .833.833 0 0 0-1.667 0M9.167 10a.833.833 0 1 0 1.667 0 .833.833 0 0 0-1.667 0M15 10a.833.833 0 1 0 1.667 0 .833.833 0 0 0-1.666 0"
    />
    <path
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.5}
      d="M3.334 10a.833.833 0 1 0 1.667 0 .833.833 0 0 0-1.667 0m5.833 0a.833.833 0 1 0 1.667 0 .833.833 0 0 0-1.667 0m5.834 0a.833.833 0 1 0 1.666 0 .833.833 0 0 0-1.666 0"
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
      d="M4 12a1 1 0 1 0 2 0 1 1 0 0 0-2 0M11 12a1 1 0 1 0 2 0 1 1 0 0 0-2 0M18 12a1 1 0 1 0 2 0 1 1 0 0 0-2 0"
    />
    <path
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.5}
      d="M4 12a1 1 0 1 0 2 0 1 1 0 0 0-2 0m7 0a1 1 0 1 0 2 0 1 1 0 0 0-2 0m7 0a1 1 0 1 0 2 0 1 1 0 0 0-2 0"
    />
  </svg>
);

const SIZES = { sm: Small, md: Medium, lg: Large };

const LineDotsIcon = ({
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

export default LineDotsIcon;
