// @generated — run `yarn icons:build` to update
import type { ComponentProps } from 'react';
const FillCircleCheckMediumIcon = ({
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
        d="M14.167 2.783A8.333 8.333 0 1 1 1.67 10.27L1.667 10l.004-.27a8.333 8.333 0 0 1 12.496-6.947m-1.078 4.961a.833.833 0 0 0-1.1-.069l-.078.07-2.744 2.743L8.089 9.41l-.078-.07a.833.833 0 0 0-1.17 1.17l.07.078 1.667 1.667.078.069a.83.83 0 0 0 1.021 0l.079-.07 3.333-3.333.07-.078a.833.833 0 0 0-.07-1.1"
      />
    </svg>
  );
};
export default FillCircleCheckMediumIcon;
