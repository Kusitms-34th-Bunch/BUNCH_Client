// @generated — run `yarn icons:build` to update
import type { ComponentProps } from 'react';
const FillCameraMediumIcon = ({
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
        fillRule="evenodd"
        d="M12.5 2.708a1.46 1.46 0 0 1 1.458 1.459A1.04 1.04 0 0 0 15 5.208h.833A2.29 2.29 0 0 1 18.125 7.5V15a2.29 2.29 0 0 1-2.292 2.292H4.167A2.29 2.29 0 0 1 1.875 15V7.5a2.29 2.29 0 0 1 2.292-2.292H5a1.04 1.04 0 0 0 1.042-1.041A1.46 1.46 0 0 1 7.5 2.708zM10 8.333a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5"
        clipRule="evenodd"
      />
    </svg>
  );
};
export default FillCameraMediumIcon;
