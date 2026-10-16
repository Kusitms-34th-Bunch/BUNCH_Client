// @generated — run `yarn icons:build` to update
import type { ComponentProps } from 'react';
const LineCopySmallIcon = ({
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
        d="M10.667 5.333V4a1.333 1.333 0 0 0-1.334-1.333H4A1.333 1.333 0 0 0 2.667 4v5.333A1.333 1.333 0 0 0 4 10.667h1.333m0-4a1.333 1.333 0 0 1 1.334-1.334H12a1.333 1.333 0 0 1 1.333 1.334V12A1.333 1.333 0 0 1 12 13.333H6.667A1.333 1.333 0 0 1 5.333 12z"
      />
    </svg>
  );
};
export default LineCopySmallIcon;
