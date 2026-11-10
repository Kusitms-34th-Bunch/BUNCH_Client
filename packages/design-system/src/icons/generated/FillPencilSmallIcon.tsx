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
      fillRule="evenodd"
      d="M11 2.514a2.486 2.486 0 0 1 1.757 4.243l-.66.66-.006.007-.008.006-6.326 6.327a.6.6 0 0 1-.424.176H2.666a.6.6 0 0 1-.6-.6v-2.667a.6.6 0 0 1 .176-.424l7-7A2.49 2.49 0 0 1 11 2.514m-1.83 1.65a.24.24 0 1 0-.34.34l2.667 2.666a.24.24 0 0 0 .34-.34z"
      clipRule="evenodd"
    />
  </svg>
);

const FillPencilSmallIcon = ({
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
export default FillPencilSmallIcon;
