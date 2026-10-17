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
      d="M5.816 2.561A5 5 0 0 1 9.973 3.75l.03.027.029-.025a5 5 0 0 1 3.944-1.2l.205.03a5 5 0 0 1 2.803 8.34l-.15.154-.04.035-6.208 6.149a.834.834 0 0 1-1.094.068l-.078-.068-6.245-6.185A5 5 0 0 1 5.816 2.56"
    />
  </svg>
);

const FillHeartMediumIcon = ({
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
export default FillHeartMediumIcon;
