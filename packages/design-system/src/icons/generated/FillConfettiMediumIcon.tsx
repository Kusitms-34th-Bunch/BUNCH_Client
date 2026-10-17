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
    <g stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}>
      <path d="M3.333 4.167H5m-.833-.834V5m5.416-1.667L9.167 5M15 4.167h1.667m-.834-.834V5M12.5 7.5l-.833.833m3.333 2.5 1.667-.416M15 15.833h1.667M15.833 15v1.667" />
      <path
        fill="currentColor"
        d="M11.667 13.765 6.235 8.333l-3.658 7.984a.833.833 0 0 0 1.107 1.107z"
      />
    </g>
  </svg>
);

const FillConfettiMediumIcon = ({
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
export default FillConfettiMediumIcon;
