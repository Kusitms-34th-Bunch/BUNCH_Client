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
      d="M8 1.5a1.834 1.834 0 0 1 1.802 1.512q.39.211.736.486c-.324.14-.602.364-.81.644a4 4 0 0 0-.609-.357.5.5 0 0 1-.286-.452.834.834 0 0 0-1.667 0 .5.5 0 0 1-.286.452A4.17 4.17 0 0 0 4.5 7.348v1.985l-.004.06c-.06.492-.234.964-.509 1.377l-.045.063h8.115l-.045-.063a3.2 3.2 0 0 1-.508-1.377l-.004-.06V7.348l-.002-.022c.36-.03.693-.155.974-.35a5 5 0 0 1 .028.357v1.965a2.17 2.17 0 0 0 1.079 1.6.5.5 0 0 1-.246.935H10.5V12a2.5 2.5 0 0 1-5 0v-.167H2.666a.5.5 0 0 1-.246-.935 2.17 2.17 0 0 0 1.08-1.6V7.31a5.17 5.17 0 0 1 2.696-4.298A1.83 1.83 0 0 1 8 1.5M6.5 12a1.5 1.5 0 0 0 3 0v-.167h-3z"
      clipRule="evenodd"
    />
    <circle cx={11.333} cy={5.333} r={1.333} fill="#F04D29" />
  </svg>
);

const LineBellDotSmallIcon = ({
  'aria-label': ariaLabel,
  'aria-labelledby': ariaLabelledby,
  ...props
}: Omit<IconProps, 'size'>) => {
  const hasAccessibleName = Boolean(ariaLabel?.trim() || ariaLabelledby?.trim());
  return (
    <Small
      aria-hidden={hasAccessibleName ? undefined : true}
      aria-label={ariaLabel}
      aria-labelledby={ariaLabelledby}
      focusable={false}
      role={hasAccessibleName ? 'img' : undefined}
      {...props}
    />
  );
};
export default LineBellDotSmallIcon;
