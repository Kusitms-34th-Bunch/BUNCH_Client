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
    <path
      fill="currentColor"
      d="M9.166 10a.833.833 0 1 0 1.667 0 .833.833 0 0 0-1.667 0M9.166 15.834a.833.833 0 1 0 1.666 0 .833.833 0 0 0-1.666 0M9.166 4.167a.833.833 0 1 0 1.667 0 .833.833 0 0 0-1.667 0"
    />
    <path
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.5}
      d="M9.166 10a.833.833 0 1 0 1.667 0 .833.833 0 0 0-1.667 0m0 5.834a.833.833 0 1 0 1.666 0 .833.833 0 0 0-1.666 0m0-11.667a.833.833 0 1 0 1.667 0 .833.833 0 0 0-1.667 0"
    />
  </svg>
);

const LineDotsVerticalMediumIcon = ({
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
export default LineDotsVerticalMediumIcon;
