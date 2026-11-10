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
      d="M13.333 1.75a.75.75 0 0 1 .75.75v.917H15a2.417 2.417 0 0 1 2.416 2.416v10A2.417 2.417 0 0 1 15 18.25H5a2.417 2.417 0 0 1-2.417-2.417v-10A2.42 2.42 0 0 1 5 3.417h.916V2.5a.75.75 0 0 1 1.5 0v.917h5.167V2.5a.75.75 0 0 1 .75-.75M5 4.917a.917.917 0 0 0-.917.916v2.584h11.833V5.833A.916.916 0 0 0 15 4.917h-.917v.916a.75.75 0 0 1-1.5 0v-.916H7.416v.916a.75.75 0 0 1-1.5 0v-.916z"
    />
  </svg>
);

const FillCalendarMediumIcon = ({
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
export default FillCalendarMediumIcon;
