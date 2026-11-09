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
      d="M10.667 12A1.333 1.333 0 0 1 12 13.333 1.333 1.333 0 0 1 13.333 12 1.333 1.333 0 0 1 12 10.667 1.334 1.334 0 0 1 10.667 12m0-8A1.333 1.333 0 0 1 12 5.333 1.334 1.334 0 0 1 13.333 4 1.333 1.333 0 0 1 12 2.667 1.334 1.334 0 0 1 10.667 4M6 12a4 4 0 0 1 4-4 4 4 0 0 1-4-4 4 4 0 0 1-4 4 4 4 0 0 1 4 4"
    />
  </svg>
);

const LineSparklesSmallIcon = ({
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
export default LineSparklesSmallIcon;
