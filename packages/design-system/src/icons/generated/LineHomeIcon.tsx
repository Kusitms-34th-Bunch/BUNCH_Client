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
    <g clipPath="url(#LineHomeIconSmall__a)">
      <path
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.2}
        d="M3.333 8H2l6-6 6 6h-1.333M3.334 8v4.667A1.333 1.333 0 0 0 4.667 14h6.667a1.334 1.334 0 0 0 1.333-1.333V8"
      />
      <path
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.2}
        d="M6 14v-4a1.333 1.333 0 0 1 1.333-1.333h1.334A1.333 1.333 0 0 1 10 10v4"
      />
    </g>
    <defs>
      <clipPath id="LineHomeIconSmall__a">
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
    <g clipPath="url(#LineHomeIconMedium__a)">
      <path
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M4.167 10H2.5L10 2.5l7.5 7.5h-1.667M4.166 10v5.833A1.666 1.666 0 0 0 5.833 17.5h8.333a1.666 1.666 0 0 0 1.667-1.667V10"
      />
      <path
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M7.5 17.5v-5a1.666 1.666 0 0 1 1.667-1.667h1.666A1.666 1.666 0 0 1 12.5 12.5v5"
      />
    </g>
    <defs>
      <clipPath id="LineHomeIconMedium__a">
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
    <g clipPath="url(#LineHomeIconLarge__a)">
      <path
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M5 12H3l9-9 9 9h-2M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7"
      />
      <path
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M9 21v-6a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v6"
      />
    </g>
    <defs>
      <clipPath id="LineHomeIconLarge__a">
        <path fill="currentColor" d="M0 0h24v24H0z" />
      </clipPath>
    </defs>
  </svg>
);

const SIZES = { sm: Small, md: Medium, lg: Large };

const LineHomeIcon = ({
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

export default LineHomeIcon;
