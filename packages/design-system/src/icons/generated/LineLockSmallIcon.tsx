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
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.2}
      d="M5.334 7.333h-.667a1.333 1.333 0 0 0-1.333 1.334v4A1.333 1.333 0 0 0 4.667 14h6.667a1.334 1.334 0 0 0 1.333-1.333v-4a1.334 1.334 0 0 0-1.333-1.334h-.667m-5.333 0h5.333m-5.333 0V4.667a2.667 2.667 0 0 1 5.333 0v2.666"
    />
  </svg>
);

const LineLockSmallIcon = ({
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
export default LineLockSmallIcon;
