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
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.5}
      d="M11 12V4.5a1.5 1.5 0 1 0-3 0V13l-1.47-1.47a1.87 1.87 0 0 0-2.28-.28 1.5 1.5 0 0 0-.536 2.022Q6.532 18.282 7 19l.196.3a6 6 0 0 0 5.012 2.7H12h2a6 6 0 0 0 6-6v-4.5a1.5 1.5 0 1 0-3 0m-6 0v-2a1.5 1.5 0 1 1 3 0V12m0-1.5a1.5 1.5 0 1 1 3 0V12M5 3 4 2m0 5H3m11-4 1-1m0 4h1"
    />
  </svg>
);

const LineHandClickLargeIcon = ({
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
export default LineHandClickLargeIcon;
