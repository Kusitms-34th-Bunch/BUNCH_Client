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
      d="M10 2.167a1.167 1.167 0 0 1 1.167 1.166.833.833 0 0 0 .833.834h.667A1.833 1.833 0 0 1 14.5 6v6a1.833 1.833 0 0 1-1.833 1.833H3.333A1.833 1.833 0 0 1 1.5 12V6a1.833 1.833 0 0 1 1.833-1.833H4a.833.833 0 0 0 .833-.834A1.167 1.167 0 0 1 6 2.167zm-2 4.5a2 2 0 1 0 0 4 2 2 0 0 0 0-4"
      clipRule="evenodd"
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
      fillRule="evenodd"
      d="M12.5 2.708a1.46 1.46 0 0 1 1.458 1.459A1.04 1.04 0 0 0 15 5.208h.833A2.29 2.29 0 0 1 18.125 7.5V15a2.29 2.29 0 0 1-2.292 2.292H4.167A2.29 2.29 0 0 1 1.875 15V7.5a2.29 2.29 0 0 1 2.292-2.292H5a1.04 1.04 0 0 0 1.042-1.041A1.46 1.46 0 0 1 7.5 2.708zM10 8.333a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5"
      clipRule="evenodd"
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
      fillRule="evenodd"
      d="M15 3.25A1.75 1.75 0 0 1 16.75 5 1.25 1.25 0 0 0 18 6.25h1A2.75 2.75 0 0 1 21.75 9v9A2.75 2.75 0 0 1 19 20.75H5A2.75 2.75 0 0 1 2.25 18V9A2.75 2.75 0 0 1 5 6.25h1A1.25 1.25 0 0 0 7.25 5 1.75 1.75 0 0 1 9 3.25zM12 10a3 3 0 1 0 0 6 3 3 0 0 0 0-6"
      clipRule="evenodd"
    />
  </svg>
);

const SIZES = { sm: Small, md: Medium, lg: Large };

const FillCameraIcon = ({
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

export default FillCameraIcon;
