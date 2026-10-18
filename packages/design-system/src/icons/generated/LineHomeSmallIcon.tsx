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

const LineHomeSmallIcon = ({
  'aria-label': ariaLabel,
  'aria-labelledby': ariaLabelledby,
  ...props
}: Omit<IconProps, 'size'>) => {
  const hasAccessibleName = Boolean(ariaLabel?.trim() || ariaLabelledby?.trim());
  return (
    <Small
      aria-hidden={hasAccessibleName ? undefined : true}
      aria-label={ariaLabel}
      aria-labelledby={ariaLabelledby}
      focusable={false}
      role={hasAccessibleName ? 'img' : undefined}
      {...props}
    />
  );
};
export default LineHomeSmallIcon;
