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
      d="M7.333 8V3a1 1 0 1 0-2 0v5.667l-.98-.98a1.245 1.245 0 0 0-1.52-.187 1 1 0 0 0-.357 1.348q1.88 3.34 2.19 3.819l.131.2a4 4 0 0 0 3.342 1.8H8h1.333a4 4 0 0 0 4-4v-3a1 1 0 1 0-2 0m-4 0V6.333a1 1 0 0 1 2 0V8m0-1a1 1 0 0 1 2 0v1m-8-6-.666-.667m0 3.334H2M9.333 2 10 1.333M10 4h.667"
    />
  </svg>
);

const LineHandClickSmallIcon = ({
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
export default LineHandClickSmallIcon;
