// @generated — run `yarn icons:build` to update
import type { ComponentProps } from 'react';
const LineUserSmallIcon = ({
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
        d="M4 14v-1.333A2.667 2.667 0 0 1 6.667 10h2.666A2.667 2.667 0 0 1 12 12.667V14M5.667 5a2.333 2.333 0 1 0 4.666 0 2.333 2.333 0 0 0-4.666 0"
      />
    </svg>
  );
};
export default LineUserSmallIcon;
