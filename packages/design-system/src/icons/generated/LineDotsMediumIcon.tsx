// @generated — run `yarn icons:build` to update
import type { ComponentProps } from 'react';
const LineDotsMediumIcon = ({
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
      <path
        fill="currentColor"
        d="M3.334 10a.833.833 0 1 0 1.667 0 .833.833 0 0 0-1.667 0M9.167 10a.833.833 0 1 0 1.667 0 .833.833 0 0 0-1.667 0M15 10a.833.833 0 1 0 1.667 0 .833.833 0 0 0-1.666 0"
      />
      <path
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M3.334 10a.833.833 0 1 0 1.667 0 .833.833 0 0 0-1.667 0m5.833 0a.833.833 0 1 0 1.667 0 .833.833 0 0 0-1.667 0m5.834 0a.833.833 0 1 0 1.666 0 .833.833 0 0 0-1.666 0"
      />
    </svg>
  );
};
export default LineDotsMediumIcon;
