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
      d="M2.666 8a.667.667 0 1 0 1.333 0 .667.667 0 0 0-1.333 0M7.333 8a.667.667 0 1 0 1.333 0 .667.667 0 0 0-1.333 0M12 8a.667.667 0 1 0 1.333 0 .667.667 0 0 0-1.334 0"
    />
    <path
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.2}
      d="M2.666 8a.667.667 0 1 0 1.333 0 .667.667 0 0 0-1.333 0m4.667 0a.667.667 0 1 0 1.333 0 .667.667 0 0 0-1.333 0m4.666 0a.667.667 0 1 0 1.334 0 .667.667 0 0 0-1.334 0"
    />
  </svg>
);

const LineDotsSmallIcon = ({
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
export default LineDotsSmallIcon;
