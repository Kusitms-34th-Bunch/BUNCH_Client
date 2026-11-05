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
      d="m8.471 1.528 6 6A.667.667 0 0 1 14 8.666h-.667v4a2 2 0 0 1-2 2h-.667V10a2 2 0 0 0-1.882-1.997L8.667 8H7.333a2 2 0 0 0-2 2v4.666h-.666a2 2 0 0 1-2-2v-4H2a.667.667 0 0 1-.471-1.138l6-6a.667.667 0 0 1 .942 0m.196 7.805a.667.667 0 0 1 .666.667v4.666H6.667V10a.667.667 0 0 1 .588-.662l.078-.005z"
    />
  </svg>
);

const FillHomeSmallIcon = ({
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
export default FillHomeSmallIcon;
