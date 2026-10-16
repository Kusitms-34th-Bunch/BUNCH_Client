// @generated — run `yarn icons:build` to update
import type { ComponentProps } from 'react';
const LineBellSmallIcon = ({
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
        d="M6 11.333V12a2 2 0 0 0 4 0v-.667m-3.334-8a1.333 1.333 0 1 1 2.667 0 4.67 4.67 0 0 1 2.666 4v2a2.67 2.67 0 0 0 1.334 2H2.666a2.67 2.67 0 0 0 1.333-2v-2a4.67 4.67 0 0 1 2.667-4"
      />
    </svg>
  );
};
export default LineBellSmallIcon;
