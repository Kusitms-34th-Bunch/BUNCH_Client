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
      d="M4 14v-1.333A2.667 2.667 0 0 1 6.667 10h2.666A2.667 2.667 0 0 1 12 12.667V14M5.667 5a2.333 2.333 0 1 0 4.666 0 2.333 2.333 0 0 0-4.666 0"
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
      d="M5 17.5v-1.667A3.333 3.333 0 0 1 8.333 12.5h3.334A3.333 3.333 0 0 1 15 15.833V17.5M7.083 6.25a2.917 2.917 0 1 0 5.834 0 2.917 2.917 0 0 0-5.834 0"
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
      d="M6 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2M8.5 7.5a3.5 3.5 0 1 0 7 0 3.5 3.5 0 0 0-7 0"
    />
  </svg>
);

const SIZES = { sm: Small, md: Medium, lg: Large };

const LineUserIcon = ({
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

export default LineUserIcon;
