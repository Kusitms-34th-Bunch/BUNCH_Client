// @generated — run `yarn icons:build` to update
import type { ComponentProps } from 'react';
import type { IconProps } from '../types';

const Shape = (props: ComponentProps<'svg'>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={34}
    height={34}
    fill="none"
    viewBox="0 0 34 34"
    {...props}
  >
    <path
      fill="#A7ADFF"
      fillRule="evenodd"
      d="M27.778 11.677a2.346 2.346 0 0 1 2.344 2.346V30.15a2.345 2.345 0 0 1-2.344 2.346H6.343a2.346 2.346 0 0 1-2.346-2.346V14.023a2.346 2.346 0 0 1 2.346-2.346zM17.1 18.635c-.971 0-1.758.787-1.758 1.758v3.837a1.758 1.758 0 0 0 3.517 0v-3.837c0-.97-.788-1.758-1.76-1.758"
      clipRule="evenodd"
    />
    <path
      fill="#454EDF"
      d="M17.113 2.003a7.315 7.315 0 0 1 7.314 7.315v1.002H19.55V9.317a2.439 2.439 0 0 0-4.876 0v1.003H9.797V9.318a7.315 7.315 0 0 1 7.316-7.315"
    />
  </svg>
);

const GraphicLockIcon = ({
  'aria-label': ariaLabel,
  'aria-labelledby': ariaLabelledby,
  ...props
}: Omit<IconProps, 'size'>) => {
  const hasAccessibleName = Boolean(ariaLabel?.trim() || ariaLabelledby?.trim());
  return (
    <Shape
      aria-hidden={hasAccessibleName ? undefined : true}
      aria-label={ariaLabel}
      aria-labelledby={ariaLabelledby}
      focusable={false}
      role={hasAccessibleName ? 'img' : undefined}
      {...props}
    />
  );
};
export default GraphicLockIcon;
