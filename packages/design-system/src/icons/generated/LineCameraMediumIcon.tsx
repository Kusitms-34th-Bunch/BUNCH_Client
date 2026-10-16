// @generated — run `yarn icons:build` to update
import type { ComponentProps } from 'react';
const LineCameraMediumIcon = ({
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
        d="M4.167 5.833H5a1.667 1.667 0 0 0 1.667-1.666.833.833 0 0 1 .833-.834h5a.833.833 0 0 1 .833.834A1.667 1.667 0 0 0 15 5.833h.833A1.666 1.666 0 0 1 17.5 7.5V15a1.667 1.667 0 0 1-1.667 1.667H4.167A1.667 1.667 0 0 1 2.5 15V7.5a1.667 1.667 0 0 1 1.667-1.667m3.333 5a2.5 2.5 0 1 0 5 0 2.5 2.5 0 0 0-5 0"
      />
    </svg>
  );
};
export default LineCameraMediumIcon;
