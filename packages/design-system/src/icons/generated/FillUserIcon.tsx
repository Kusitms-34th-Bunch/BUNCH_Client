// @generated — run `yarn icons:build` to update
import type { ComponentProps } from 'react';
import type { IconProps } from '../types';

const Small = (props: ComponentProps<'svg'>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={16}
    height={16}
    fill="none"
    viewBox="0 0 16 16"
    {...props}
  >
    <g clipPath="url(#FillUserIconSmall__a)">
      <path
        fill="currentColor"
        d="M9.429 9c.947 0 1.855.395 2.525 1.098A3.85 3.85 0 0 1 13 12.75v.75c0 .398-.15.78-.418 1.06-.268.282-.632.44-1.01.44H4.428c-.38 0-.743-.158-1.01-.44A1.54 1.54 0 0 1 3 13.5v-.75c0-.995.376-1.948 1.046-2.652A3.49 3.49 0 0 1 6.571 9zM5.5 5.5a2.5 2.5 0 1 0 5 0 2.5 2.5 0 0 0-5 0"
      />
    </g>
    <defs>
      <clipPath id="FillUserIconSmall__a">
        <path fill="currentColor" d="M0 0h16v16H0z" />
      </clipPath>
    </defs>
  </svg>
);
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
const Large = (props: ComponentProps<'svg'>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={24}
    height={24}
    fill="none"
    viewBox="0 0 24 24"
    {...props}
  >
    <g clipPath="url(#FillUserIconLarge__a)">
      <path
        fill="currentColor"
        d="M14 14a5 5 0 0 1 5 5v1a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-1a5 5 0 0 1 5-5zM8 8a4 4 0 1 0 8 0 4 4 0 0 0-8 0"
      />
    </g>
    <defs>
      <clipPath id="FillUserIconLarge__a">
        <path fill="currentColor" d="M0 0h24v24H0z" />
      </clipPath>
    </defs>
  </svg>
);

const SIZES = { sm: Small, md: Medium, lg: Large };

const FillUserIcon = ({
  size = 'md',
  'aria-label': ariaLabel,
  'aria-labelledby': ariaLabelledby,
  ...props
}: IconProps) => {
  const hasAccessibleName = Boolean(ariaLabel?.trim() || ariaLabelledby?.trim());
  const Icon = SIZES[size];

  return (
    <Icon
      aria-hidden={hasAccessibleName ? undefined : true}
      aria-label={ariaLabel}
      aria-labelledby={ariaLabelledby}
      focusable={false}
      role={hasAccessibleName ? 'img' : undefined}
      {...props}
    />
  );
};

export default FillUserIcon;
