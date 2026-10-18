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

const FillUserSmallIcon = ({
  'aria-label': ariaLabel,
  'aria-labelledby': ariaLabelledby,
  ...props
}: Omit<IconProps, 'size'>) => {
  const hasAccessibleName = Boolean(ariaLabel?.trim() || ariaLabelledby?.trim());
  return (
    <Small
      aria-hidden={hasAccessibleName ? undefined : true}
      aria-label={ariaLabel}
      aria-labelledby={ariaLabelledby}
      focusable={false}
      role={hasAccessibleName ? 'img' : undefined}
      {...props}
    />
  );
};
export default FillUserSmallIcon;
