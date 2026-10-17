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
    <g clipPath="url(#LineSearchIconSmall__a)">
      <path
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.2}
        d="M2 6.667a4.667 4.667 0 1 0 9.333 0 4.667 4.667 0 0 0-9.333 0M14 14l-4-4"
      />
    </g>
    <defs>
      <clipPath id="LineSearchIconSmall__a">
        <path fill="currentColor" d="M0 0h16v16H0z" />
      </clipPath>
    </defs>
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
    <g clipPath="url(#LineSearchIconMedium__a)">
      <path
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M2.5 8.333a5.834 5.834 0 1 0 11.667 0 5.834 5.834 0 0 0-11.667 0M17.5 17.5l-5-5"
      />
    </g>
    <defs>
      <clipPath id="LineSearchIconMedium__a">
        <path fill="currentColor" d="M0 0h20v20H0z" />
      </clipPath>
    </defs>
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
    <g clipPath="url(#LineSearchIconLarge__a)">
      <path
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M3 10a7 7 0 1 0 14 0 7 7 0 0 0-14 0M21 21l-6-6"
      />
    </g>
    <defs>
      <clipPath id="LineSearchIconLarge__a">
        <path fill="currentColor" d="M0 0h24v24H0z" />
      </clipPath>
    </defs>
  </svg>
);

const SIZES = { sm: Small, md: Medium, lg: Large };

const LineSearchIcon = ({
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

export default LineSearchIcon;
