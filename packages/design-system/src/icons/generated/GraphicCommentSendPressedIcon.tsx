// @generated — run `yarn icons:build` to update
import type { ComponentProps } from 'react';
import type { IconProps } from '../types';

const Shape = (props: ComponentProps<'svg'>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    xmlnsXlink="http://www.w3.org/1999/xlink"
    width={30}
    height={30}
    fill="none"
    viewBox="0 0 30 30"
    {...props}
  >
    <use xlinkHref="#GraphicCommentSendPressedIcon__a" fill="#454EDF" />
    <use xlinkHref="#GraphicCommentSendPressedIcon__a" fill="#000" fillOpacity={0.2} />
    <use xlinkHref="#GraphicCommentSendPressedIcon__b" stroke="#454EDF" />
    <use xlinkHref="#GraphicCommentSendPressedIcon__b" stroke="#000" strokeOpacity={0.2} />
    <path
      stroke="#fff"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.5}
      d="m20 15-5-5-5 5m5-5v10"
    />
    <defs>
      <path
        id="GraphicCommentSendPressedIcon__a"
        d="M3.75 15a11.25 11.25 0 1 0 22.5 0 11.25 11.25 0 0 0-22.5 0"
      />
      <path
        id="GraphicCommentSendPressedIcon__b"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M3.75 15a11.25 11.25 0 1 0 22.5 0 11.25 11.25 0 0 0-22.5 0"
      />
    </defs>
  </svg>
);

const GraphicCommentSendPressedIcon = ({
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
export default GraphicCommentSendPressedIcon;
