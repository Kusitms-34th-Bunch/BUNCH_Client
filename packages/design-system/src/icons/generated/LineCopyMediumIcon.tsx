// @generated — run `yarn icons:build` to update
import type { ComponentProps } from 'react';
const LineCopyMediumIcon = ({
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
        d="M13.333 6.667V5a1.667 1.667 0 0 0-1.666-1.667H5A1.667 1.667 0 0 0 3.333 5v6.667A1.667 1.667 0 0 0 5 13.333h1.667m0-5a1.667 1.667 0 0 1 1.666-1.666H15a1.667 1.667 0 0 1 1.667 1.666V15A1.667 1.667 0 0 1 15 16.667H8.333A1.667 1.667 0 0 1 6.667 15z"
      />
    </svg>
  );
};
export default LineCopyMediumIcon;
