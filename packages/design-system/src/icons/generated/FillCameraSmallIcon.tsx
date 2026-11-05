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

const FillCameraSmallIcon = ({
  'aria-label': ariaLabel,
  'aria-labelledby': ariaLabelledby,
  ...props
}: Omit<IconProps, 'size'>) => {
  const hasAccessibleName = Boolean(ariaLabel?.trim() || ariaLabelledby?.trim());
  return (
    <Small
      aria-hidden={hasAccessibleName ? undefined : true}
      aria-label={ariaLabel}
      aria-labelledby={ariaLabelledby}
      focusable={false}
      role={hasAccessibleName ? 'img' : undefined}
      {...props}
    />
  );
};
export default FillCameraSmallIcon;
