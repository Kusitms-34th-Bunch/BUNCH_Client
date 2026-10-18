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
      fillRule="evenodd"
      d="M15 3.25A1.75 1.75 0 0 1 16.75 5 1.25 1.25 0 0 0 18 6.25h1A2.75 2.75 0 0 1 21.75 9v9A2.75 2.75 0 0 1 19 20.75H5A2.75 2.75 0 0 1 2.25 18V9A2.75 2.75 0 0 1 5 6.25h1A1.25 1.25 0 0 0 7.25 5 1.75 1.75 0 0 1 9 3.25zM12 10a3 3 0 1 0 0 6 3 3 0 0 0 0-6"
      clipRule="evenodd"
    />
  </svg>
);

const FillCameraLargeIcon = ({
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
export default FillCameraLargeIcon;
