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
      d="M3.333 5.833h.834m0 0H7.5m-3.333 0 .833 10A1.666 1.666 0 0 0 6.667 17.5h6.666A1.666 1.666 0 0 0 15 15.833l.833-10m-8.333 0h5m-5 0v-2.5a.833.833 0 0 1 .833-.833h3.334a.833.833 0 0 1 .833.833v2.5m0 0h3.333m0 0h.834M8.333 9.167v5m3.334-5v5"
    />
  </svg>
);

const LineTrashcanMediumIcon = ({
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
export default LineTrashcanMediumIcon;
