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
      fillRule="evenodd"
      d="M13.75 3.143a3.107 3.107 0 0 1 2.196 5.303l-.825.825q-.004.004-.008.01l-.01.007-7.907 7.908a.75.75 0 0 1-.53.22H3.333a.75.75 0 0 1-.75-.75v-3.333c0-.199.08-.39.22-.53l8.75-8.75a3.1 3.1 0 0 1 2.197-.91m-2.288 2.062a.3.3 0 1 0-.424.424l3.333 3.334a.301.301 0 0 0 .425-.425z"
      clipRule="evenodd"
    />
  </svg>
);

const FillPencilMediumIcon = ({
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
export default FillPencilMediumIcon;
