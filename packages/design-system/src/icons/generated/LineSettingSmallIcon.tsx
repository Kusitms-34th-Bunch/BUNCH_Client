// @generated — run `yarn icons:build` to update
import type { ComponentProps } from 'react';
const LineSettingSmallIcon = ({
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
      <g clipPath="url(#LineSettingSmallIcon__a)">
        <path
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.2}
          d="M6.883 2.878c.284-1.17 1.95-1.17 2.234 0a1.15 1.15 0 0 0 1.715.71c1.029-.626 2.207.551 1.58 1.58a1.148 1.148 0 0 0 .71 1.715c1.17.284 1.17 1.95 0 2.234a1.15 1.15 0 0 0-.71 1.715c.626 1.029-.551 2.207-1.58 1.58a1.148 1.148 0 0 0-1.715.71c-.284 1.17-1.95 1.17-2.234 0a1.15 1.15 0 0 0-1.715-.71c-1.029.626-2.207-.551-1.58-1.58a1.15 1.15 0 0 0-.71-1.715c-1.17-.284-1.17-1.95 0-2.234a1.15 1.15 0 0 0 .71-1.715c-.626-1.029.551-2.207 1.58-1.58.667.405 1.531.047 1.715-.71"
        />
        <path
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.2}
          d="M6 8a2 2 0 1 0 4 0 2 2 0 0 0-4 0"
        />
      </g>
      <defs>
        <clipPath id="LineSettingSmallIcon__a">
          <path fill="currentColor" d="M0 0h16v16H0z" />
        </clipPath>
      </defs>
    </svg>
  );
};
export default LineSettingSmallIcon;
