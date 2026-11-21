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
      fillRule="evenodd"
      d="M10 1.875a2.29 2.29 0 0 1 2.253 1.89q.488.265.92.608a2.5 2.5 0 0 0-1.012.804 5 5 0 0 0-.761-.446.63.63 0 0 1-.358-.564 1.042 1.042 0 0 0-2.084 0c0 .241-.14.461-.358.564a5.21 5.21 0 0 0-2.975 4.454v2.482q0 .038-.005.075a3.96 3.96 0 0 1-.636 1.72l-.056.08h10.144q-.028-.04-.057-.08a3.96 3.96 0 0 1-.635-1.72 1 1 0 0 1-.005-.075V9.185l-.002-.028c.45-.037.866-.194 1.217-.438a7 7 0 0 1 .035.448v2.456a2.7 2.7 0 0 0 1.35 2 .626.626 0 0 1-.308 1.169h-3.542V15a3.125 3.125 0 0 1-6.25 0v-.208H3.333a.625.625 0 0 1-.307-1.169 2.71 2.71 0 0 0 1.349-2V9.137a6.46 6.46 0 0 1 3.37-5.372A2.29 2.29 0 0 1 10 1.875M8.125 15a1.875 1.875 0 0 0 3.75 0v-.208h-3.75z"
      clipRule="evenodd"
    />
    <circle cx={14.167} cy={6.667} r={1.667} fill="#F04D29" />
  </svg>
);

const LineBellDotMediumIcon = ({
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
export default LineBellDotMediumIcon;
