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
    <path
      fill="#777FF2"
      d="M26 31.149c0-5.33-5.149-9.649-11.5-9.649S3 25.82 3 31.148v2.519c0 1.012.82 1.833 1.833 1.833h19.332c1.012 0 1.832-.82 1.833-1.832zM21.792 12.333a7.333 7.333 0 1 1-14.667 0 7.333 7.333 0 0 1 14.667 0"
    />
    <path
      fill="#A7ADFF"
      d="M24.5 21.5c6.351 0 11.5 4.32 11.5 9.648l-.002 2.52a1.833 1.833 0 0 1-1.833 1.832H27.34a3.65 3.65 0 0 0 .491-1.831l.002-2.52c0-4.036-2.33-7.41-5.743-9.435a13.7 13.7 0 0 1 2.41-.214M24.542 5a7.333 7.333 0 1 1-3.544 13.754 9.14 9.14 0 0 0 2.627-6.421 9.13 9.13 0 0 0-2.628-6.42A7.3 7.3 0 0 1 24.542 5"
    />
  </svg>
);

const GraphicPeopleIcon = ({
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
export default GraphicPeopleIcon;
