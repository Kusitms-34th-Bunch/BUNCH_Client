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
      d="m10.59 1.911 7.5 7.5a.833.833 0 0 1-.59 1.423h-.832v5a2.5 2.5 0 0 1-2.5 2.5h-.834V12.5a2.5 2.5 0 0 0-2.353-2.496L10.834 10H9.167a2.5 2.5 0 0 0-2.5 2.5v5.834h-.833a2.5 2.5 0 0 1-2.5-2.5v-5h-.833c-.742 0-1.114-.898-.59-1.423l7.5-7.5a.833.833 0 0 1 1.179 0m.244 9.756a.833.833 0 0 1 .834.833v5.834H8.334V12.5a.833.833 0 0 1 .736-.827l.097-.006z"
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
      d="m12.707 2.293 9 9c.63.63.184 1.707-.707 1.707h-1v6a3 3 0 0 1-3 3h-1v-7a3 3 0 0 0-2.824-2.995L13 12h-2a3 3 0 0 0-3 3v7H7a3 3 0 0 1-3-3v-6H3c-.89 0-1.337-1.077-.707-1.707l9-9a1 1 0 0 1 1.414 0M13 14a1 1 0 0 1 1 1v7h-4v-7a1 1 0 0 1 .883-.993L11 14z"
    />
  </svg>
);

const SIZES = { sm: Small, md: Medium, lg: Large };

const FillHomeIcon = ({
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

export default FillHomeIcon;
