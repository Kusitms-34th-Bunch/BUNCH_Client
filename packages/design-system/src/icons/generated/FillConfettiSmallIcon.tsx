// @generated — run `yarn icons:build` to update
import type { ComponentProps } from 'react';
const FillConfettiSmallIcon = ({
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
      <g stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.2}>
        <path d="M2.667 3.333H4m-.667-.666V4m4.334-1.333L7.333 4M12 3.333h1.333m-.666-.666V4M10 6l-.667.667m2.667 2 1.333-.334M12 12.667h1.333M12.667 12v1.333" />
        <path
          fill="currentColor"
          d="M9.333 11.012 4.988 6.667l-2.927 6.386a.667.667 0 0 0 .886.886z"
        />
      </g>
    </svg>
  );
};
export default FillConfettiSmallIcon;
