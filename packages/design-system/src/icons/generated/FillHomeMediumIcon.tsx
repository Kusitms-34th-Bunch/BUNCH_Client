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
    <path
      fill="currentColor"
      d="m10.59 1.911 7.5 7.5a.833.833 0 0 1-.59 1.423h-.832v5a2.5 2.5 0 0 1-2.5 2.5h-.834V12.5a2.5 2.5 0 0 0-2.353-2.496L10.834 10H9.167a2.5 2.5 0 0 0-2.5 2.5v5.834h-.833a2.5 2.5 0 0 1-2.5-2.5v-5h-.833c-.742 0-1.114-.898-.59-1.423l7.5-7.5a.833.833 0 0 1 1.179 0m.244 9.756a.833.833 0 0 1 .834.833v5.834H8.334V12.5a.833.833 0 0 1 .736-.827l.097-.006z"
    />
  </svg>
);

const FillHomeMediumIcon = ({
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
export default FillHomeMediumIcon;
