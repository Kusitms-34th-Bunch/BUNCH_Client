// @generated — run `yarn icons:build` to update
import type { ComponentProps } from 'react';
import type { IconProps } from '../types';

const Shape = (props: ComponentProps<'svg'>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={20}
    height={20}
    fill="none"
    viewBox="0 0 20 20"
    {...props}
  >
    <path
      fill="#BFBFBF"
      d="M0 10C0 4.477 4.477 0 10 0s10 4.477 10 10-4.477 10-10 10S0 15.523 0 10"
    />
    <path
      fill="#fff"
      d="M6.666 13.333h1.667l4.375-4.375a1.179 1.179 0 1 0-1.667-1.666l-4.375 4.375zM10.624 7.708l1.667 1.667z"
    />
    <path
      stroke="#fff"
      strokeLinecap="round"
      strokeLinejoin="round"
      d="m10.624 7.708 1.667 1.667m-5.625 3.958h1.667l4.375-4.375a1.179 1.179 0 1 0-1.667-1.666l-4.375 4.375z"
    />
  </svg>
);

const GraphicRoleDraftAuthorMediumIcon = ({
  'aria-label': ariaLabel,
  'aria-labelledby': ariaLabelledby,
  ...props
}: Omit<IconProps, 'size'>) => {
  const hasAccessibleName = Boolean(ariaLabel?.trim() || ariaLabelledby?.trim());
  return (
    <Shape
      aria-hidden={hasAccessibleName ? undefined : true}
      aria-label={ariaLabel}
      aria-labelledby={ariaLabelledby}
      focusable={false}
      role={hasAccessibleName ? 'img' : undefined}
      {...props}
    />
  );
};
export default GraphicRoleDraftAuthorMediumIcon;
