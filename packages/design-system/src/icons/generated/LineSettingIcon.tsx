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
    <g clipPath="url(#LineSettingIconSmall__a)">
      <path
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.2}
        d="M6.883 2.878c.284-1.17 1.95-1.17 2.234 0a1.15 1.15 0 0 0 1.715.71c1.029-.626 2.207.551 1.58 1.58a1.148 1.148 0 0 0 .71 1.715c1.17.284 1.17 1.95 0 2.234a1.15 1.15 0 0 0-.71 1.715c.626 1.029-.551 2.207-1.58 1.58a1.148 1.148 0 0 0-1.715.71c-.284 1.17-1.95 1.17-2.234 0a1.15 1.15 0 0 0-1.715-.71c-1.029.626-2.207-.551-1.58-1.58a1.15 1.15 0 0 0-.71-1.715c-1.17-.284-1.17-1.95 0-2.234a1.15 1.15 0 0 0 .71-1.715c-.626-1.029.551-2.207 1.58-1.58.667.405 1.531.047 1.715-.71"
      />
      <path
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.2}
        d="M6 8a2 2 0 1 0 4 0 2 2 0 0 0-4 0"
      />
    </g>
    <defs>
      <clipPath id="LineSettingIconSmall__a">
        <path fill="currentColor" d="M0 0h16v16H0z" />
      </clipPath>
    </defs>
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
    <g clipPath="url(#LineSettingIconMedium__a)">
      <path
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M8.604 3.598c.355-1.464 2.437-1.464 2.792 0a1.437 1.437 0 0 0 2.144.888c1.286-.783 2.758.688 1.975 1.975a1.436 1.436 0 0 0 .887 2.143c1.464.355 1.464 2.437 0 2.792a1.437 1.437 0 0 0-.888 2.144c.784 1.286-.688 2.758-1.975 1.975a1.436 1.436 0 0 0-2.143.887c-.355 1.464-2.437 1.464-2.792 0a1.437 1.437 0 0 0-2.144-.888c-1.286.784-2.758-.688-1.975-1.975a1.437 1.437 0 0 0-.888-2.143c-1.463-.355-1.463-2.437 0-2.792a1.437 1.437 0 0 0 .889-2.144c-.783-1.286.688-2.758 1.975-1.975a1.435 1.435 0 0 0 2.143-.888"
      />
      <path
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M7.5 10a2.5 2.5 0 1 0 5 0 2.5 2.5 0 0 0-5 0"
      />
    </g>
    <defs>
      <clipPath id="LineSettingIconMedium__a">
        <path fill="currentColor" d="M0 0h20v20H0z" />
      </clipPath>
    </defs>
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
    <g clipPath="url(#LineSettingIconLarge__a)">
      <path
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 0 0 2.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 0 0 1.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 0 0-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 0 0-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.723 1.723 0 0 0-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 0 0-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 0 0 1.066-2.573c-.94-1.543.826-3.31 2.37-2.37 1 .608 2.296.07 2.572-1.065"
      />
      <path
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M9 12a3 3 0 1 0 6 0 3 3 0 0 0-6 0"
      />
    </g>
    <defs>
      <clipPath id="LineSettingIconLarge__a">
        <path fill="currentColor" d="M0 0h24v24H0z" />
      </clipPath>
    </defs>
  </svg>
);

const SIZES = { sm: Small, md: Medium, lg: Large };

const LineSettingIcon = ({
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

export default LineSettingIcon;
