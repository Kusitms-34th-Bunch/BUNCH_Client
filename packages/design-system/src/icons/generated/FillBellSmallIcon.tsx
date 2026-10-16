// @generated — run `yarn icons:build` to update
import type { ComponentProps } from 'react';
const FillBellSmallIcon = ({
  'aria-label': ariaLabel,
  'aria-labelledby': ariaLabelledby,
  ...props
}: ComponentProps<'svg'>) => {
  const hasAccessibleName = Boolean(ariaLabel?.trim() || ariaLabelledby?.trim());
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={16}
      height={16}
      fill="none"
      viewBox="0 0 16 16"
      aria-hidden={hasAccessibleName ? undefined : true}
      aria-label={ariaLabel}
      aria-labelledby={ariaLabelledby}
      focusable={false}
      role={hasAccessibleName ? 'img' : undefined}
      {...props}
    >
      <g fill="currentColor">
        <path d="M9.49 12.667c.576 0 .88.683.496 1.112a2.66 2.66 0 0 1-3.075.657 2.7 2.7 0 0 1-.898-.657.666.666 0 0 1 .422-1.107l.074-.004zM8 1.334a2 2 0 0 1 1.916 1.427l.03.114.006.029a5.34 5.34 0 0 1 2.683 4.046l.018.191.013.193v1.954l.014.09a2 2 0 0 0 .762 1.232l.111.078.108.066c.574.325.374 1.177-.251 1.243l-.077.004H2.666c-.685 0-.925-.91-.329-1.247a2 2 0 0 0 .982-1.375l.014-.096v-1.98a5.33 5.33 0 0 1 2.548-4.302l.165-.098.007-.028A2 2 0 0 1 7.76 1.348l.121-.011z" />
      </g>
    </svg>
  );
};
export default FillBellSmallIcon;
