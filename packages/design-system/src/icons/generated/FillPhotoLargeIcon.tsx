// @generated — run `yarn icons:build` to update
import type { ComponentProps } from 'react';
const FillPhotoLargeIcon = ({
  'aria-label': ariaLabel,
  'aria-labelledby': ariaLabelledby,
  ...props
}: ComponentProps<'svg'>) => {
  const hasAccessibleName = Boolean(ariaLabel?.trim() || ariaLabelledby?.trim());
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={24}
      height={24}
      fill="none"
      viewBox="0 0 24 24"
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
        d="M18 2.25A3.75 3.75 0 0 1 21.75 6v12A3.75 3.75 0 0 1 18 21.75H6A3.75 3.75 0 0 1 2.25 18V6A3.75 3.75 0 0 1 6 2.25zm-8.5 8.83c-.29 0-.628.122-.98.46l-4.77 4.77V18A2.25 2.25 0 0 0 6 20.25h12A2.25 2.25 0 0 0 20.25 18v-1.69l-2.77-2.77c-.352-.338-.69-.46-.98-.46s-.628.122-.98.46l-.46.46 1.47 1.47a.75.75 0 1 1-1.06 1.06l-4.99-4.99c-.352-.338-.69-.46-.98-.46"
        clipRule="evenodd"
      />
    </svg>
  );
};
export default FillPhotoLargeIcon;
