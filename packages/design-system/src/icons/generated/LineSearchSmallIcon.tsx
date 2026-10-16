// @generated — run `yarn icons:build` to update
import type { ComponentProps } from 'react';
const LineSearchSmallIcon = ({
  'aria-label': ariaLabel,
  'aria-labelledby': ariaLabelledby,
  ...props
}: ComponentProps<'svg'>) => {
  const hasAccessibleName = Boolean(ariaLabel?.trim() || ariaLabelledby?.trim());
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={16}
      height={16}
      fill="none"
      viewBox="0 0 16 16"
      aria-hidden={hasAccessibleName ? undefined : true}
      aria-label={ariaLabel}
      aria-labelledby={ariaLabelledby}
      focusable={false}
      role={hasAccessibleName ? 'img' : undefined}
      {...props}
    >
      <g clipPath="url(#LineSearchSmallIcon__a)">
        <path
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.2}
          d="M2 6.667a4.667 4.667 0 1 0 9.333 0 4.667 4.667 0 0 0-9.333 0M14 14l-4-4"
        />
      </g>
      <defs>
        <clipPath id="LineSearchSmallIcon__a">
          <path fill="currentColor" d="M0 0h16v16H0z" />
        </clipPath>
      </defs>
    </svg>
  );
};
export default LineSearchSmallIcon;
