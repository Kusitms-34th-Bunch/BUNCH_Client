// @generated — run `yarn icons:build` to update
import type { ComponentProps } from 'react';
const LineSearchMediumIcon = ({
  'aria-label': ariaLabel,
  'aria-labelledby': ariaLabelledby,
  ...props
}: ComponentProps<'svg'>) => {
  const hasAccessibleName = Boolean(ariaLabel?.trim() || ariaLabelledby?.trim());
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={20}
      height={20}
      fill="none"
      viewBox="0 0 20 20"
      aria-hidden={hasAccessibleName ? undefined : true}
      aria-label={ariaLabel}
      aria-labelledby={ariaLabelledby}
      focusable={false}
      role={hasAccessibleName ? 'img' : undefined}
      {...props}
    >
      <g clipPath="url(#LineSearchMediumIcon__a)">
        <path
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M2.5 8.333a5.834 5.834 0 1 0 11.667 0 5.834 5.834 0 0 0-11.667 0M17.5 17.5l-5-5"
        />
      </g>
      <defs>
        <clipPath id="LineSearchMediumIcon__a">
          <path fill="currentColor" d="M0 0h20v20H0z" />
        </clipPath>
      </defs>
    </svg>
  );
};
export default LineSearchMediumIcon;
