// @generated — run `yarn icons:build` to update
import type { ComponentProps } from 'react';
import type { IconProps } from '../types';

const Shape = (props: ComponentProps<'svg'>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={48}
    height={48}
    fill="none"
    viewBox="0 0 48 48"
    {...props}
  >
    <g fill="#fff">
      <path d="M8.11 23.67h8.11v8.11H8.11zM0 31.78h8.11v8.11H0zM16.22 31.78h8.11v8.11h-8.11zM8.11 39.89h8.11V48H8.11zM31.77.69h8.11V8.8h-8.11zM23.66 8.8h8.11v8.11h-8.11zM39.88 8.8h8.11v8.11h-8.11zM31.77 16.91h8.11v8.11h-8.11z" />
    </g>
  </svg>
);

const GraphicEntryJoinIcon = ({
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
export default GraphicEntryJoinIcon;
