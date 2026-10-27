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
      d="M2.667 4.667h.666m0 0H6m-2.667 0 .667 8A1.333 1.333 0 0 0 5.333 14h5.334A1.334 1.334 0 0 0 12 12.667l.667-8M6 4.667h4m-4 0v-2A.667.667 0 0 1 6.667 2h2.666a.667.667 0 0 1 .667.667v2m0 0h2.667m0 0h.666M6.667 7.333v4m2.666-4v4"
    />
  </svg>
);

const LineTrashcanSmallIcon = ({
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
export default LineTrashcanSmallIcon;
