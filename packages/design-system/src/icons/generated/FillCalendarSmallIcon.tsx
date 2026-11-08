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
      d="M10.667 1.4a.6.6 0 0 1 .6.6v.733H12a1.934 1.934 0 0 1 1.934 1.934v8A1.935 1.935 0 0 1 12 14.6H4a1.934 1.934 0 0 1-1.933-1.933v-8A1.934 1.934 0 0 1 4 2.733h.733V2a.6.6 0 0 1 1.2 0v.733h4.134V2a.6.6 0 0 1 .6-.6M4 3.934a.734.734 0 0 0-.733.733v2.066h9.466V4.667A.733.733 0 0 0 12 3.934h-.733v.733a.6.6 0 1 1-1.2 0v-.733H5.934v.733a.6.6 0 0 1-1.2 0v-.733z"
    />
  </svg>
);

const FillCalendarSmallIcon = ({
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
export default FillCalendarSmallIcon;
