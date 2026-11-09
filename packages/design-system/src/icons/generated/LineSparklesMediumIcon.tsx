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
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.5}
      d="M13.333 15A1.667 1.667 0 0 1 15 16.667 1.667 1.667 0 0 1 16.667 15 1.666 1.666 0 0 1 15 13.333 1.666 1.666 0 0 1 13.333 15m0-10A1.666 1.666 0 0 1 15 6.667 1.667 1.667 0 0 1 16.667 5 1.666 1.666 0 0 1 15 3.333 1.667 1.667 0 0 1 13.333 5M7.5 15a5 5 0 0 1 5-5 5 5 0 0 1-5-5 5 5 0 0 1-5 5 5 5 0 0 1 5 5"
    />
  </svg>
);

const LineSparklesMediumIcon = ({
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
export default LineSparklesMediumIcon;
