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
    <g fill="currentColor">
      <path d="M9.49 12.667c.576 0 .88.683.496 1.112a2.66 2.66 0 0 1-3.075.657 2.7 2.7 0 0 1-.898-.657.666.666 0 0 1 .422-1.107l.074-.004zM8 1.334a2 2 0 0 1 1.916 1.427l.03.114.006.029a5.34 5.34 0 0 1 2.683 4.046l.018.191.013.193v1.954l.014.09a2 2 0 0 0 .762 1.232l.111.078.108.066c.574.325.374 1.177-.251 1.243l-.077.004H2.666c-.685 0-.925-.91-.329-1.247a2 2 0 0 0 .982-1.375l.014-.096v-1.98a5.33 5.33 0 0 1 2.548-4.302l.165-.098.007-.028A2 2 0 0 1 7.76 1.348l.121-.011z" />
    </g>
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
    <g fill="currentColor">
      <path d="M11.862 15.833c.721 0 1.102.853.621 1.39a3.33 3.33 0 0 1-3.844.82 3.3 3.3 0 0 1-1.123-.82.833.833 0 0 1 .529-1.384l.091-.005zM10 1.666c1.131 0 2.088.753 2.396 1.784l.038.143.007.036a6.68 6.68 0 0 1 3.353 5.057l.023.24.016.24v2.442l.018.114a2.5 2.5 0 0 0 .952 1.539l.14.098.134.082c.717.406.467 1.472-.314 1.553l-.097.005H3.333c-.857 0-1.156-1.136-.41-1.558a2.5 2.5 0 0 0 1.226-1.72l.017-.118.001-2.475a6.67 6.67 0 0 1 3.184-5.379l.207-.121.008-.036a2.5 2.5 0 0 1 2.135-1.908l.152-.015z" />
    </g>
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
    <g fill="currentColor">
      <path d="M14.235 19c.865 0 1.322 1.024.745 1.668A4 4 0 0 1 12 22a4 4 0 0 1-2.98-1.332c-.552-.616-.158-1.579.634-1.661l.11-.006zM12 2c1.358 0 2.506.903 2.875 2.141l.046.171.008.043a8.01 8.01 0 0 1 4.024 6.069l.028.287L19 11v2.931l.021.136a3 3 0 0 0 1.143 1.847l.167.117.162.099c.86.487.56 1.766-.377 1.864L20 18H4c-1.028 0-1.387-1.364-.493-1.87a3 3 0 0 0 1.472-2.063L5 13.924l.001-2.97A8 8 0 0 1 8.822 4.5l.248-.146.01-.043a3 3 0 0 1 2.562-2.29l.182-.017z" />
    </g>
  </svg>
);

const SIZES = { sm: Small, md: Medium, lg: Large };

const FillBellIcon = ({
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

export default FillBellIcon;
