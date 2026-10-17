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
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.2}
      d="M3.333 5H4a1.333 1.333 0 0 0 1.333-1.333A.667.667 0 0 1 6 3h4a.667.667 0 0 1 .667.667A1.333 1.333 0 0 0 12 5h.667A1.333 1.333 0 0 1 14 6.333v6a1.333 1.333 0 0 1-1.333 1.334H3.333A1.333 1.333 0 0 1 2 12.333v-6A1.333 1.333 0 0 1 3.333 5M6 9a2 2 0 1 0 4 0 2 2 0 0 0-4 0"
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
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.5}
      d="M4.167 5.833H5a1.667 1.667 0 0 0 1.667-1.666.833.833 0 0 1 .833-.834h5a.833.833 0 0 1 .833.834A1.667 1.667 0 0 0 15 5.833h.833A1.666 1.666 0 0 1 17.5 7.5V15a1.667 1.667 0 0 1-1.667 1.667H4.167A1.667 1.667 0 0 1 2.5 15V7.5a1.667 1.667 0 0 1 1.667-1.667m3.333 5a2.5 2.5 0 1 0 5 0 2.5 2.5 0 0 0-5 0"
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
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.5}
      d="M5 7h1a2 2 0 0 0 2-2 1 1 0 0 1 1-1h6a1 1 0 0 1 1 1 2 2 0 0 0 2 2h1a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2m4 6a3 3 0 1 0 6 0 3 3 0 0 0-6 0"
    />
  </svg>
);

const SIZES = { sm: Small, md: Medium, lg: Large };

const LineCameraIcon = ({
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

export default LineCameraIcon;
