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
      <path d="M31.2 3c1.073 0 1.943.87 1.943 1.942v2.03L20.29 19.436c-.402.39-.684.883-.82 1.422l-.048.235-.639 3.832a2.994 2.994 0 0 0 3.202 3.475l3.793-.315a3 3 0 0 0 1.836-.834l5.528-5.36v13.167c0 1.072-.87 1.943-1.943 1.943H5.942A1.943 1.943 0 0 1 4 35.057V4.942C4 3.87 4.87 3 5.942 3z" />
      <path d="m33.143 18.929-7.008 6.796-.116.093a.9.9 0 0 1-.416.148l-3.793.316-.105.003a.87.87 0 0 1-.824-1.012l.638-3.832a.87.87 0 0 1 .253-.481l11.37-11.027z" />
    </g>
    <path
      fill="#454EDF"
      d="m20.88 25.273.639-3.832a.87.87 0 0 1 .252-.48L35.265 7.874a.87.87 0 0 1 1.248.04l3.177 3.494a.87.87 0 0 1-.038 1.208L26.135 25.724a.87.87 0 0 1-.533.242l-3.792.316a.87.87 0 0 1-.93-1.009"
    />
  </svg>
);

const GraphicEditIcon = ({
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
export default GraphicEditIcon;
