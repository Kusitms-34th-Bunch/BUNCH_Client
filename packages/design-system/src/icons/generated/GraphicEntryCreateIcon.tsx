// @generated — run `yarn icons:build` to update
import type { ComponentProps } from 'react';
import type { IconProps } from '../types';

const Shape = (props: ComponentProps<'svg'>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={48}
    height={48}
    fill="none"
    viewBox="0 0 48 48"
    {...props}
  >
    <g fill="#fff">
      <path d="M27 28h7v7h-7zM0 28h7v7H0zM13 28h7v7h-7zM7 35h7v7H7zM0 41h7v7H0z" />
      <path d="M13 41h7v7h-7zM14 15h7v7h-7z" />
    </g>
  </svg>
);

const GraphicEntryCreateIcon = ({
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
export default GraphicEntryCreateIcon;
