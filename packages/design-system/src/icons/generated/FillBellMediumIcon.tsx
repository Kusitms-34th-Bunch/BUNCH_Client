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
    <g fill="currentColor">
      <path d="M11.862 15.833c.721 0 1.102.853.621 1.39a3.33 3.33 0 0 1-3.844.82 3.3 3.3 0 0 1-1.123-.82.833.833 0 0 1 .529-1.384l.091-.005zM10 1.666c1.131 0 2.088.753 2.396 1.784l.038.143.007.036a6.68 6.68 0 0 1 3.353 5.057l.023.24.016.24v2.442l.018.114a2.5 2.5 0 0 0 .952 1.539l.14.098.134.082c.717.406.467 1.472-.314 1.553l-.097.005H3.333c-.857 0-1.156-1.136-.41-1.558a2.5 2.5 0 0 0 1.226-1.72l.017-.118.001-2.475a6.67 6.67 0 0 1 3.184-5.379l.207-.121.008-.036a2.5 2.5 0 0 1 2.135-1.908l.152-.015z" />
    </g>
  </svg>
);

const FillBellMediumIcon = ({
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
export default FillBellMediumIcon;
