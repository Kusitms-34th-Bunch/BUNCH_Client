// @generated — run `yarn icons:build` to update
import type { ComponentProps } from 'react';
import type { IconProps } from '../types';

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
      d="M16 2.25a.75.75 0 0 1 .75.75v1.25H18A2.75 2.75 0 0 1 20.75 7v12A2.75 2.75 0 0 1 18 21.75H6A2.75 2.75 0 0 1 3.25 19V7A2.75 2.75 0 0 1 6 4.25h1.25V3a.75.75 0 0 1 1.5 0v1.25h6.5V3a.75.75 0 0 1 .75-.75M6 5.75A1.25 1.25 0 0 0 4.75 7v3.25h14.5V7A1.25 1.25 0 0 0 18 5.75h-1.25V7a.75.75 0 0 1-1.5 0V5.75h-6.5V7a.75.75 0 0 1-1.5 0V5.75z"
    />
  </svg>
);

const FillCalendarLargeIcon = ({
  'aria-label': ariaLabel,
  'aria-labelledby': ariaLabelledby,
  ...props
}: Omit<IconProps, 'size'>) => {
  const hasAccessibleName = Boolean(ariaLabel?.trim() || ariaLabelledby?.trim());
  return (
    <Large
      aria-hidden={hasAccessibleName ? undefined : true}
      aria-label={ariaLabel}
      aria-labelledby={ariaLabelledby}
      focusable={false}
      role={hasAccessibleName ? 'img' : undefined}
      {...props}
    />
  );
};
export default FillCalendarLargeIcon;
