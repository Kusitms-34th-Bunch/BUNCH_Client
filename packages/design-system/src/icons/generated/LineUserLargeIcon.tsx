// @generated — run `yarn icons:build` to update
import type { ComponentProps } from 'react';
const LineUserLargeIcon = ({
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
        d="M6 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2M8.5 7.5a3.5 3.5 0 1 0 7 0 3.5 3.5 0 0 0-7 0"
      />
    </svg>
  );
};
export default LineUserLargeIcon;
