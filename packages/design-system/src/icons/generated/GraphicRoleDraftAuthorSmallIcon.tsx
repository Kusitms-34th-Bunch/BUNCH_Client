// @generated — run `yarn icons:build` to update
import type { ComponentProps } from 'react';
import type { IconProps } from '../types';

const Shape = (props: ComponentProps<'svg'>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={16}
    height={16}
    fill="none"
    viewBox="0 0 16 16"
    {...props}
  >
    <path fill="#BFBFBF" d="M0 8a8 8 0 1 1 16 0A8 8 0 0 1 0 8" />
    <path
      fill="#fff"
      d="M4.666 11.333h1.667l4.375-4.375A1.179 1.179 0 1 0 9.04 5.292L4.666 9.667zM8.624 5.708l1.667 1.667z"
    />
    <path
      stroke="#fff"
      strokeLinecap="round"
      strokeLinejoin="round"
      d="m8.624 5.708 1.667 1.667m-5.625 3.958h1.667l4.375-4.375A1.179 1.179 0 1 0 9.04 5.292L4.666 9.667z"
    />
  </svg>
);

const GraphicRoleDraftAuthorSmallIcon = ({
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
export default GraphicRoleDraftAuthorSmallIcon;
