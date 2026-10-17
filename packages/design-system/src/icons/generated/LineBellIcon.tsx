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
      d="M6 11.333V12a2 2 0 0 0 4 0v-.667m-3.334-8a1.333 1.333 0 1 1 2.667 0 4.67 4.67 0 0 1 2.666 4v2a2.67 2.67 0 0 0 1.334 2H2.666a2.67 2.67 0 0 0 1.333-2v-2a4.67 4.67 0 0 1 2.667-4"
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
      d="M7.5 14.167V15a2.5 2.5 0 0 0 5 0v-.833m-4.166-10a1.667 1.667 0 0 1 3.333 0 5.83 5.83 0 0 1 3.334 5v2.5a3.33 3.33 0 0 0 1.666 2.5H3.334a3.33 3.33 0 0 0 1.667-2.5v-2.5a5.83 5.83 0 0 1 3.333-5"
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
      d="M9 17v1a3 3 0 0 0 6 0v-1M10 5a2 2 0 1 1 4 0 7 7 0 0 1 4 6v3a4 4 0 0 0 2 3H4a4 4 0 0 0 2-3v-3a7 7 0 0 1 4-6"
    />
  </svg>
);

const SIZES = { sm: Small, md: Medium, lg: Large };

const LineBellIcon = ({
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

export default LineBellIcon;
