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
    <path
      fill="currentColor"
      d="M4.652 2.049a4 4 0 0 1 3.325.95l.025.022.023-.02a4 4 0 0 1 3.155-.96l.164.024a4 4 0 0 1 2.243 6.672l-.12.123-.032.028-4.967 4.919a.67.67 0 0 1-.875.055l-.063-.055-4.995-4.948a4 4 0 0 1 2.117-6.81"
    />
  </svg>
);

const FillHeartSmallIcon = ({
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
export default FillHeartSmallIcon;
