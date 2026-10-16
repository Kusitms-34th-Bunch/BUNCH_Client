// @generated — run `yarn icons:build` to update
import type { ComponentProps } from 'react';
const LineCircleCheckSmallIcon = ({
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
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.2}
        d="m6 8 1.333 1.333L10 6.667M2 8a6 6 0 1 0 12 0A6 6 0 0 0 2 8"
      />
    </svg>
  );
};
export default LineCircleCheckSmallIcon;
