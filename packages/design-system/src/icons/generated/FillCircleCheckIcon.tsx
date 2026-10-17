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
      d="M11.333 2.227a6.667 6.667 0 1 1-9.996 5.989L1.333 8l.004-.216a6.667 6.667 0 0 1 9.996-5.557m-.862 3.968a.67.67 0 0 0-.88-.055l-.062.055L7.333 8.39l-.862-.861-.062-.056a.667.667 0 0 0-.936.936l.056.062 1.333 1.334.063.055a.67.67 0 0 0 .817 0l.063-.055 2.666-2.667.056-.063a.67.67 0 0 0-.056-.88"
    />
  </svg>
);
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
      d="M14.167 2.783A8.333 8.333 0 1 1 1.67 10.27L1.667 10l.004-.27a8.333 8.333 0 0 1 12.496-6.947m-1.078 4.961a.833.833 0 0 0-1.1-.069l-.078.07-2.744 2.743L8.089 9.41l-.078-.07a.833.833 0 0 0-1.17 1.17l.07.078 1.667 1.667.078.069a.83.83 0 0 0 1.021 0l.079-.07 3.333-3.333.07-.078a.833.833 0 0 0-.07-1.1"
    />
  </svg>
);
const Large = (props: ComponentProps<'svg'>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={24}
    height={24}
    fill="none"
    viewBox="0 0 24 24"
    {...props}
  >
    <path
      fill="currentColor"
      d="M17 3.34a10 10 0 1 1-14.995 8.984L2 12l.005-.324A10 10 0 0 1 17 3.34m-1.293 5.953a1 1 0 0 0-1.32-.083l-.094.083L11 12.585l-1.293-1.292-.094-.083a1 1 0 0 0-1.403 1.403l.083.094 2 2 .094.083a1 1 0 0 0 1.226 0l.094-.083 4-4 .083-.094a1 1 0 0 0-.083-1.32"
    />
  </svg>
);

const SIZES = { sm: Small, md: Medium, lg: Large };

const FillCircleCheckIcon = ({
  size = 'md',
  'aria-label': ariaLabel,
  'aria-labelledby': ariaLabelledby,
  ...props
}: IconProps) => {
  const hasAccessibleName = Boolean(ariaLabel?.trim() || ariaLabelledby?.trim());
  const Icon = SIZES[size];

  return (
    <Icon
      aria-hidden={hasAccessibleName ? undefined : true}
      aria-label={ariaLabel}
      aria-labelledby={ariaLabelledby}
      focusable={false}
      role={hasAccessibleName ? 'img' : undefined}
      {...props}
    />
  );
};

export default FillCircleCheckIcon;
