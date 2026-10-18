// @generated — run `yarn icons:build` to update
import type { ComponentProps } from 'react';
import type { IconProps } from '../types';

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

const LineSearchMediumIcon = ({
  'aria-label': ariaLabel,
  'aria-labelledby': ariaLabelledby,
  ...props
}: Omit<IconProps, 'size'>) => {
  const hasAccessibleName = Boolean(ariaLabel?.trim() || ariaLabelledby?.trim());
  return (
    <Medium
      aria-hidden={hasAccessibleName ? undefined : true}
      aria-label={ariaLabel}
      aria-labelledby={ariaLabelledby}
      focusable={false}
      role={hasAccessibleName ? 'img' : undefined}
      {...props}
    />
  );
};
export default LineSearchMediumIcon;
