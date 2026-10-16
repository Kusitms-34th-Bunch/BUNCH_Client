// @generated — run `yarn icons:build` to update
import type { ComponentProps } from 'react';
const LineBellMediumIcon = ({
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
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M7.5 14.167V15a2.5 2.5 0 0 0 5 0v-.833m-4.166-10a1.667 1.667 0 0 1 3.333 0 5.83 5.83 0 0 1 3.334 5v2.5a3.33 3.33 0 0 0 1.666 2.5H3.334a3.33 3.33 0 0 0 1.667-2.5v-2.5a5.83 5.83 0 0 1 3.333-5"
      />
    </svg>
  );
};
export default LineBellMediumIcon;
