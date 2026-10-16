// @generated — run `yarn icons:build` to update
import type { ComponentProps } from 'react';
const LineAddMediumIcon = ({
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
      <g clipPath="url(#LineAddMediumIcon__a)">
        <path
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M10 4.167v11.667M4.166 10h11.667"
        />
      </g>
      <defs>
        <clipPath id="LineAddMediumIcon__a">
          <path fill="currentColor" d="M0 0h20v20H0z" />
        </clipPath>
      </defs>
    </svg>
  );
};
export default LineAddMediumIcon;
