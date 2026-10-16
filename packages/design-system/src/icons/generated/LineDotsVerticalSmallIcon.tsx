// @generated — run `yarn icons:build` to update
import type { ComponentProps } from 'react';
const LineDotsVerticalSmallIcon = ({
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
      <path
        fill="currentColor"
        d="M7.334 8a.667.667 0 1 0 1.333 0 .667.667 0 0 0-1.333 0M7.334 12.666a.667.667 0 1 0 1.333 0 .667.667 0 0 0-1.333 0M7.334 3.333a.667.667 0 1 0 1.333 0 .667.667 0 0 0-1.333 0"
      />
      <path
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.2}
        d="M7.334 8a.667.667 0 1 0 1.333 0 .667.667 0 0 0-1.333 0m0 4.666a.667.667 0 1 0 1.333 0 .667.667 0 0 0-1.333 0m0-9.333a.667.667 0 1 0 1.333 0 .667.667 0 0 0-1.333 0"
      />
    </svg>
  );
};
export default LineDotsVerticalSmallIcon;
