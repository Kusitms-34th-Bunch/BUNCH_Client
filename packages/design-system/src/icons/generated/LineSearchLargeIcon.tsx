// @generated — run `yarn icons:build` to update
import type { ComponentProps } from 'react';
const LineSearchLargeIcon = ({
  'aria-label': ariaLabel,
  'aria-labelledby': ariaLabelledby,
  ...props
}: ComponentProps<'svg'>) => {
  const hasAccessibleName = Boolean(ariaLabel?.trim() || ariaLabelledby?.trim());
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={24}
      height={24}
      fill="none"
      viewBox="0 0 24 24"
      aria-hidden={hasAccessibleName ? undefined : true}
      aria-label={ariaLabel}
      aria-labelledby={ariaLabelledby}
      focusable={false}
      role={hasAccessibleName ? 'img' : undefined}
      {...props}
    >
      <g clipPath="url(#LineSearchLargeIcon__a)">
        <path
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M3 10a7 7 0 1 0 14 0 7 7 0 0 0-14 0M21 21l-6-6"
        />
      </g>
      <defs>
        <clipPath id="LineSearchLargeIcon__a">
          <path fill="currentColor" d="M0 0h24v24H0z" />
        </clipPath>
      </defs>
    </svg>
  );
};
export default LineSearchLargeIcon;
