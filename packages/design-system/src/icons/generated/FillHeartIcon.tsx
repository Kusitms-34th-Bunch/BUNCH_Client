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
      d="M4.652 2.049a4 4 0 0 1 3.325.95l.025.022.023-.02a4 4 0 0 1 3.155-.96l.164.024a4 4 0 0 1 2.243 6.672l-.12.123-.032.028-4.967 4.919a.67.67 0 0 1-.875.055l-.063-.055-4.995-4.948a4 4 0 0 1 2.117-6.81"
    />
  </svg>
);
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
const Large = (props: ComponentProps<'svg'>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={24}
    height={24}
    fill="none"
    viewBox="0 0 24 24"
    {...props}
  >
    <path
      fill="currentColor"
      d="M6.978 3.074a6 6 0 0 1 4.988 1.425l.037.033.034-.03a6 6 0 0 1 4.733-1.44l.246.036a6 6 0 0 1 3.364 10.008l-.18.184-.048.042-7.45 7.378a1 1 0 0 1-1.313.082l-.094-.082-7.493-7.421A6 6 0 0 1 6.978 3.074"
    />
  </svg>
);

const SIZES = { sm: Small, md: Medium, lg: Large };

const FillHeartIcon = ({
  size = 'md',
  'aria-label': ariaLabel,
  'aria-labelledby': ariaLabelledby,
  ...props
}: IconProps) => {
  const hasAccessibleName = Boolean(ariaLabel?.trim() || ariaLabelledby?.trim());
  const Icon = SIZES[size];

  return (
    <Icon
      aria-hidden={hasAccessibleName ? undefined : true}
      aria-label={ariaLabel}
      aria-labelledby={ariaLabelledby}
      focusable={false}
      role={hasAccessibleName ? 'img' : undefined}
      {...props}
    />
  );
};

export default FillHeartIcon;
