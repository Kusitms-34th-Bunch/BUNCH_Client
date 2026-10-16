// @generated — run `yarn icons:build` to update
import type { ComponentProps } from 'react';
const FillPhotoMediumIcon = ({
  'aria-label': ariaLabel,
  'aria-labelledby': ariaLabelledby,
  ...props
}: ComponentProps<'svg'>) => {
  const hasAccessibleName = Boolean(ariaLabel?.trim() || ariaLabelledby?.trim());
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={20}
      height={20}
      fill="none"
      viewBox="0 0 20 20"
      aria-hidden={hasAccessibleName ? undefined : true}
      aria-label={ariaLabel}
      aria-labelledby={ariaLabelledby}
      focusable={false}
      role={hasAccessibleName ? 'img' : undefined}
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
};
export default FillPhotoMediumIcon;
