// @generated — run `yarn icons:build` to update
import type { ComponentProps } from 'react';
const LineConfettiLargeIcon = ({
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
      <path
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M4 5h2M5 4v2m6.5-2L11 6m7-1h2m-1-1v2m-4 3-1 1m4 3 2-.5M18 19h2m-1-1v2m-5-3.482L7.482 10l-4.39 9.58a1 1 0 0 0 1.329 1.329z"
      />
    </svg>
  );
};
export default LineConfettiLargeIcon;
