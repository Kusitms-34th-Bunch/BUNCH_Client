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
      d="M16.5 3.771a3.729 3.729 0 0 1 2.636 6.365l-.99.989-.01.011q-.005.005-.012.01l-9.488 9.49a.9.9 0 0 1-.637.263H4a.9.9 0 0 1-.9-.9v-4c0-.238.096-.467.264-.636l10.5-10.5A3.73 3.73 0 0 1 16.5 3.771m-2.746 2.475a.36.36 0 1 0-.508.509l4 4a.361.361 0 0 0 .51-.51z"
      clipRule="evenodd"
    />
  </svg>
);

const FillPencilLargeIcon = ({
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
export default FillPencilLargeIcon;
