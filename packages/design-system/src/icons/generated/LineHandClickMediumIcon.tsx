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
      d="M9.167 10V3.75a1.25 1.25 0 0 0-2.5 0v7.083L5.442 9.608a1.556 1.556 0 0 0-1.9-.233 1.25 1.25 0 0 0-.447 1.685q2.349 4.175 2.738 4.773l.164.25a5 5 0 0 0 4.176 2.25H10h1.667a5 5 0 0 0 5-5v-3.75a1.25 1.25 0 0 0-2.5 0m-5 0V7.917a1.25 1.25 0 1 1 2.5 0V10m0-1.25a1.25 1.25 0 0 1 2.5 0V10m-10-7.5-.834-.833m0 4.166H2.5M11.667 2.5l.833-.833M12.5 5h.833"
    />
  </svg>
);

const LineHandClickMediumIcon = ({
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
export default LineHandClickMediumIcon;
