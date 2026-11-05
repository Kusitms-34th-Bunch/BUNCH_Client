// @generated — run `yarn icons:build` to update
import type { ComponentProps } from 'react';
import type { IconProps } from '../types';

const Medium = (props: ComponentProps<'svg'>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={20}
    height={20}
    fill="none"
    viewBox="0 0 20 20"
    {...props}
  >
    <g clipPath="url(#FillUserIconMedium__a)">
      <path
        fill="currentColor"
        d="M11.714 11c1.137 0 2.227.527 3.03 1.464C15.55 13.403 16 14.674 16 16v1c0 .53-.18 1.04-.502 1.414-.322.375-.758.586-1.212.586H5.714c-.454 0-.89-.21-1.212-.586A2.18 2.18 0 0 1 4 17v-1c0-1.326.452-2.598 1.255-3.536C6.06 11.528 7.15 11 8.285 11zM6.7 6.25a3.25 3.25 0 1 0 6.5 0 3.25 3.25 0 0 0-6.5 0"
      />
    </g>
    <defs>
      <clipPath id="FillUserIconMedium__a">
        <path fill="currentColor" d="M0 0h20v20H0z" />
      </clipPath>
    </defs>
  </svg>
);

const FillUserMediumIcon = ({
  'aria-label': ariaLabel,
  'aria-labelledby': ariaLabelledby,
  ...props
}: Omit<IconProps, 'size'>) => {
  const hasAccessibleName = Boolean(ariaLabel?.trim() || ariaLabelledby?.trim());
  return (
    <Medium
      aria-hidden={hasAccessibleName ? undefined : true}
      aria-label={ariaLabel}
      aria-labelledby={ariaLabelledby}
      focusable={false}
      role={hasAccessibleName ? 'img' : undefined}
      {...props}
    />
  );
};
export default FillUserMediumIcon;
