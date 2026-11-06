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
      d="M8 1.4a5.94 5.94 0 0 1 5.483 3.663 5.935 5.935 0 0 1-1.286 6.465l-2.83 2.83a1.935 1.935 0 0 1-2.732 0l-2.83-2.83A5.934 5.934 0 0 1 8 1.4m0 3.9a2 2 0 1 0 0 4 2 2 0 0 0 0-4"
    />
  </svg>
);

const FillMapPinSmallIcon = ({
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
export default FillMapPinSmallIcon;
