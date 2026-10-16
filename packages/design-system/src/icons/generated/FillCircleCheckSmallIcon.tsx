// @generated — run `yarn icons:build` to update
import type { ComponentProps } from 'react';
const FillCircleCheckSmallIcon = ({
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
      <path
        fill="currentColor"
        d="M11.333 2.227a6.667 6.667 0 1 1-9.996 5.989L1.333 8l.004-.216a6.667 6.667 0 0 1 9.996-5.557m-.862 3.968a.67.67 0 0 0-.88-.055l-.062.055L7.333 8.39l-.862-.861-.062-.056a.667.667 0 0 0-.936.936l.056.062 1.333 1.334.063.055a.67.67 0 0 0 .817 0l.063-.055 2.666-2.667.056-.063a.67.67 0 0 0-.056-.88"
      />
    </svg>
  );
};
export default FillCircleCheckSmallIcon;
