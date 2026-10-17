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
      fillRule="evenodd"
      d="M12 1.5A2.5 2.5 0 0 1 14.5 4v8a2.5 2.5 0 0 1-2.5 2.5H4A2.5 2.5 0 0 1 1.5 12V4A2.5 2.5 0 0 1 4 1.5zM6.333 7.387c-.193 0-.419.081-.653.306l-3.18 3.18V12A1.5 1.5 0 0 0 4 13.5h8a1.5 1.5 0 0 0 1.5-1.5v-1.126l-1.847-1.847c-.234-.226-.46-.307-.653-.307s-.419.081-.653.307l-.307.306.98.98a.5.5 0 0 1-.707.707L6.986 7.693c-.234-.225-.46-.306-.653-.306"
      clipRule="evenodd"
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
      fillRule="evenodd"
      d="M15 1.875A3.125 3.125 0 0 1 18.125 5v10A3.125 3.125 0 0 1 15 18.125H5A3.125 3.125 0 0 1 1.875 15V5A3.125 3.125 0 0 1 5 1.875zM7.917 9.233c-.241 0-.524.102-.817.384l-3.975 3.975V15A1.875 1.875 0 0 0 5 16.875h10A1.875 1.875 0 0 0 16.875 15v-1.408l-2.309-2.309c-.293-.281-.575-.383-.816-.383s-.524.102-.816.383l-.383.384 1.224 1.224a.625.625 0 1 1-.884.884L8.733 9.617c-.293-.282-.575-.384-.816-.384"
      clipRule="evenodd"
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
      fillRule="evenodd"
      d="M18 2.25A3.75 3.75 0 0 1 21.75 6v12A3.75 3.75 0 0 1 18 21.75H6A3.75 3.75 0 0 1 2.25 18V6A3.75 3.75 0 0 1 6 2.25zm-8.5 8.83c-.29 0-.628.122-.98.46l-4.77 4.77V18A2.25 2.25 0 0 0 6 20.25h12A2.25 2.25 0 0 0 20.25 18v-1.69l-2.77-2.77c-.352-.338-.69-.46-.98-.46s-.628.122-.98.46l-.46.46 1.47 1.47a.75.75 0 1 1-1.06 1.06l-4.99-4.99c-.352-.338-.69-.46-.98-.46"
      clipRule="evenodd"
    />
  </svg>
);

const SIZES = { sm: Small, md: Medium, lg: Large };

const FillPhotoIcon = ({
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

export default FillPhotoIcon;
