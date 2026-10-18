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
      fill="#777FF2"
      d="M20.513 23.702a29.5 29.5 0 0 1-3.329 8.293c-.061 0-.123.005-.184.005q-.093-.002-.186-.005a29.5 29.5 0 0 1-3.327-8.293zm-9.647 0a32 32 0 0 0 2.828 7.924 15 15 0 0 1-2.434-.768 15 15 0 0 1-4.867-3.251 15 15 0 0 1-2.807-3.905zm19.548 0a15 15 0 0 1-2.807 3.905 15 15 0 0 1-4.867 3.251c-.79.327-1.605.58-2.435.768a32 32 0 0 0 2.829-7.924zM10.43 12.852A32 32 0 0 0 10.157 17c0 1.392.093 2.778.272 4.149h-7.84A15 15 0 0 1 2 17c0-1.417.205-2.812.59-4.149zm10.567 0a29.5 29.5 0 0 1 0 8.297h-7.992a29.5 29.5 0 0 1 0-8.298zm10.414 0A15 15 0 0 1 32 17c0 1.407-.202 2.802-.59 4.149h-7.839c.18-1.371.272-2.757.272-4.149s-.093-2.778-.272-4.149zM13.694 2.371a32 32 0 0 0-2.828 7.926h-7.28a15 15 0 0 1 2.807-3.905c2.02-2.02 4.558-3.4 7.3-4.02m3.49-.368a29.5 29.5 0 0 1 3.33 8.294h-7.027a29.5 29.5 0 0 1 3.327-8.294Q16.907 2 17 2q.093.001.184.004m3.12.369c2.744.62 5.282 2 7.303 4.02a15 15 0 0 1 2.807 3.905h-7.28a32 32 0 0 0-2.83-7.925"
    />
    <path
      fill="#A7ADFF"
      d="M20.513 23.702a29.5 29.5 0 0 1-3.329 8.293c-.061 0-.123.005-.184.005q-.093-.002-.186-.005a29.5 29.5 0 0 1-3.327-8.293zm-9.647 0a32 32 0 0 0 2.828 7.924 15 15 0 0 1-2.434-.768 15 15 0 0 1-4.867-3.251 15 15 0 0 1-2.807-3.905zm19.548 0a15 15 0 0 1-2.807 3.905 15 15 0 0 1-4.867 3.251c-.79.327-1.605.58-2.435.768a32 32 0 0 0 2.829-7.924zm-16.72-21.33a32 32 0 0 0-2.828 7.926h-7.28a15 15 0 0 1 2.807-3.905c2.02-2.02 4.558-3.4 7.3-4.02m3.49-.368a29.5 29.5 0 0 1 3.33 8.294h-7.027a29.5 29.5 0 0 1 3.327-8.294Q16.907 2 17 2q.093.001.184.004m3.12.369c2.744.62 5.282 2 7.303 4.02a15 15 0 0 1 2.807 3.905h-7.28a32 32 0 0 0-2.83-7.925"
    />
  </svg>
);

const GraphicGlobeIcon = ({
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
export default GraphicGlobeIcon;
