// @generated — run `yarn icons:build` to update
import type { ComponentProps } from 'react';
const LineHeartLargeIcon = ({
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
      <g clipPath="url(#LineHeartLargeIcon__a)">
        <path
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M19.5 12.572 12 20l-7.5-7.428A5 5 0 1 1 12 6.006a5.002 5.002 0 0 1 8.52.876 5 5 0 0 1-1.02 5.696"
        />
      </g>
      <defs>
        <clipPath id="LineHeartLargeIcon__a">
          <path fill="currentColor" d="M0 0h24v24H0z" />
        </clipPath>
      </defs>
    </svg>
  );
};
export default LineHeartLargeIcon;
