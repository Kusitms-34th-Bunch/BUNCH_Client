// @generated — run `yarn icons:build` to update
import type { ComponentProps } from 'react';
import type { IconProps } from '../types';

const Shape = (props: ComponentProps<'svg'>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={40}
    height={40}
    fill="none"
    viewBox="0 0 40 40"
    {...props}
  >
    <g fill="#A7ADFF">
      <path d="M30.39 8.322a2.1 2.1 0 0 1 2.099 2.1v15.954H11.956a3.15 3.15 0 0 1-3.148-3.149V8.322z" />
      <path d="M35.91 1.004a3.15 3.15 0 0 1 3.149 3.148v19.075a3.15 3.15 0 0 1-3.149 3.149h-1.306V10.422a4.214 4.214 0 0 0-3.997-4.208l-.217-.006H8.808V4.152a3.15 3.15 0 0 1 3.148-3.148z" />
    </g>
    <path
      fill="#454EDF"
      d="M32.489 31.148a2.1 2.1 0 0 1-2.1 2.1H15.087l-4.196 4.241c-1.319 1.333-3.591.4-3.591-1.476v-2.765H3.1a2.1 2.1 0 0 1-2.099-2.1V10.421c0-1.159.94-2.099 2.1-2.099H30.39c1.16 0 2.099.94 2.099 2.1z"
    />
  </svg>
);

const GraphicChatIcon = ({
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
export default GraphicChatIcon;
