// @generated — run `yarn icons:build` to update
import type { ComponentProps } from 'react';
const FillPhotoSmallIcon = ({
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
        fill="currentColor"
        fillRule="evenodd"
        d="M12 1.5A2.5 2.5 0 0 1 14.5 4v8a2.5 2.5 0 0 1-2.5 2.5H4A2.5 2.5 0 0 1 1.5 12V4A2.5 2.5 0 0 1 4 1.5zM6.333 7.387c-.193 0-.419.081-.653.306l-3.18 3.18V12A1.5 1.5 0 0 0 4 13.5h8a1.5 1.5 0 0 0 1.5-1.5v-1.126l-1.847-1.847c-.234-.226-.46-.307-.653-.307s-.419.081-.653.307l-.307.306.98.98a.5.5 0 0 1-.707.707L6.986 7.693c-.234-.225-.46-.306-.653-.306"
        clipRule="evenodd"
      />
    </svg>
  );
};
export default FillPhotoSmallIcon;
