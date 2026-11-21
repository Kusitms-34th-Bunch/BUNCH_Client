// @generated — run `yarn icons:build` to update
import type { ComponentProps } from 'react';
import type { IconProps } from '../types';

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
      fillRule="evenodd"
      d="M12 2.25a2.747 2.747 0 0 1 2.704 2.268c.39.21.758.456 1.104.73-.486.21-.903.545-1.215.965a6 6 0 0 0-.913-.535.75.75 0 0 1-.43-.678 1.25 1.25 0 0 0-2.5 0 .75.75 0 0 1-.43.678 6.25 6.25 0 0 0-3.57 5.345V14a1 1 0 0 1-.006.09 4.75 4.75 0 0 1-.762 2.064q-.034.049-.069.096h12.174q-.034-.047-.068-.096a4.75 4.75 0 0 1-.763-2.064 1 1 0 0 1-.006-.09v-2.977q0-.017-.003-.035a3 3 0 0 0 1.461-.525 8 8 0 0 1 .042.537v2.947a3.25 3.25 0 0 0 1.62 2.4.75.75 0 0 1-.37 1.403h-4.25V18a3.75 3.75 0 0 1-7.5 0v-.25H4a.75.75 0 0 1-.369-1.402 3.25 3.25 0 0 0 1.62-2.4v-2.983a7.75 7.75 0 0 1 4.044-6.447A2.75 2.75 0 0 1 12 2.25M9.75 18a2.25 2.25 0 0 0 4.5 0v-.25h-4.5z"
      clipRule="evenodd"
    />
    <circle cx={17} cy={8} r={2} fill="#F04D29" />
  </svg>
);

const LineBellDotLargeIcon = ({
  'aria-label': ariaLabel,
  'aria-labelledby': ariaLabelledby,
  ...props
}: Omit<IconProps, 'size'>) => {
  const hasAccessibleName = Boolean(ariaLabel?.trim() || ariaLabelledby?.trim());
  return (
    <Large
      aria-hidden={hasAccessibleName ? undefined : true}
      aria-label={ariaLabel}
      aria-labelledby={ariaLabelledby}
      focusable={false}
      role={hasAccessibleName ? 'img' : undefined}
      {...props}
    />
  );
};
export default LineBellDotLargeIcon;
