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
      d="M2.667 3.333H4m-.667-.666V4m4.334-1.333L7.333 4M12 3.333h1.333m-.666-.666V4M10 6l-.667.667m2.667 2 1.333-.334M12 12.667h1.333M12.667 12v1.333m-3.334-2.321L4.988 6.667l-2.927 6.386a.667.667 0 0 0 .886.886z"
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
      d="M3.333 4.167H5m-.833-.834V5m5.416-1.667L9.167 5M15 4.167h1.667m-.834-.834V5M12.5 7.5l-.833.833m3.333 2.5 1.667-.416M15 15.833h1.667M15.833 15v1.667m-4.166-2.902L6.235 8.333l-3.658 7.984a.833.833 0 0 0 1.107 1.107z"
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
      d="M4 5h2M5 4v2m6.5-2L11 6m7-1h2m-1-1v2m-4 3-1 1m4 3 2-.5M18 19h2m-1-1v2m-5-3.482L7.482 10l-4.39 9.58a1 1 0 0 0 1.329 1.329z"
    />
  </svg>
);

const SIZES = { sm: Small, md: Medium, lg: Large };

const LineConfettiIcon = ({
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

export default LineConfettiIcon;
