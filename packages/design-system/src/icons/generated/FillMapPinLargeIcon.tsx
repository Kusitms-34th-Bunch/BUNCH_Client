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
      d="M12 2.25a8.751 8.751 0 0 1 6.187 14.938l-4.243 4.242a2.75 2.75 0 0 1-3.887 0l-4.245-4.242A8.752 8.752 0 0 1 7.14 3.725a8.75 8.75 0 0 1 4.86-1.475M12 8a3 3 0 1 0 0 6 3 3 0 0 0 0-6"
    />
  </svg>
);

const FillMapPinLargeIcon = ({
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
export default FillMapPinLargeIcon;
