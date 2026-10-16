// @generated — run `yarn icons:build` to update
import type { ComponentProps } from 'react';
const LineSettingMediumIcon = ({
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
      <g clipPath="url(#LineSettingMediumIcon__a)">
        <path
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M8.604 3.598c.355-1.464 2.437-1.464 2.792 0a1.437 1.437 0 0 0 2.144.888c1.286-.783 2.758.688 1.975 1.975a1.436 1.436 0 0 0 .887 2.143c1.464.355 1.464 2.437 0 2.792a1.437 1.437 0 0 0-.888 2.144c.784 1.286-.688 2.758-1.975 1.975a1.436 1.436 0 0 0-2.143.887c-.355 1.464-2.437 1.464-2.792 0a1.437 1.437 0 0 0-2.144-.888c-1.286.784-2.758-.688-1.975-1.975a1.437 1.437 0 0 0-.888-2.143c-1.463-.355-1.463-2.437 0-2.792a1.437 1.437 0 0 0 .889-2.144c-.783-1.286.688-2.758 1.975-1.975a1.435 1.435 0 0 0 2.143-.888"
        />
        <path
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M7.5 10a2.5 2.5 0 1 0 5 0 2.5 2.5 0 0 0-5 0"
        />
      </g>
      <defs>
        <clipPath id="LineSettingMediumIcon__a">
          <path fill="currentColor" d="M0 0h20v20H0z" />
        </clipPath>
      </defs>
    </svg>
  );
};
export default LineSettingMediumIcon;
