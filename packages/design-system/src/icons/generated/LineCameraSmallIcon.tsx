// @generated — run `yarn icons:build` to update
import type { ComponentProps } from 'react';
const LineCameraSmallIcon = ({
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
        d="M3.333 5H4a1.333 1.333 0 0 0 1.333-1.333A.667.667 0 0 1 6 3h4a.667.667 0 0 1 .667.667A1.333 1.333 0 0 0 12 5h.667A1.333 1.333 0 0 1 14 6.333v6a1.333 1.333 0 0 1-1.333 1.334H3.333A1.333 1.333 0 0 1 2 12.333v-6A1.333 1.333 0 0 1 3.333 5M6 9a2 2 0 1 0 4 0 2 2 0 0 0-4 0"
      />
    </svg>
  );
};
export default LineCameraSmallIcon;
