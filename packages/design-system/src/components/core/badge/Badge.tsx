import type { ComponentProps } from 'react';
import type { VariantProps } from 'tailwind-variants';
import { tv } from '../../../utils';

const badge = tv({
  base: 'inline-flex max-w-full shrink-0 items-center justify-center overflow-clip rounded-r3 whitespace-nowrap',
  variants: {
    variant: { weak: '', strong: '' },
    color: { brand: '', gray: '' },
    size: {
      lg: 'px-padding-p4 py-padding-p2 typography-body-2-meduim',
      md: 'px-[7px] py-[3px] typography-body-3-semi-bold',
      sm: 'px-[7px] py-[3px] typography-caption-1-medium',
    },
  },
  compoundVariants: [
    { variant: 'weak', color: 'brand', class: 'bg-chip-blue-bg text-chip-blue-fg' },
    { variant: 'weak', color: 'gray', class: 'bg-chip-gray-bg text-chip-gray-fg' },
    { variant: 'strong', color: 'brand', class: 'bg-chip-blue-fg text-text-inversed' },
    { variant: 'strong', color: 'gray', class: 'bg-chip-gray-fg text-chip-gray-bg' },
  ],
  defaultVariants: { variant: 'weak', color: 'brand', size: 'lg' },
});

type BadgeVariants = VariantProps<typeof badge>;

export type BadgeVariant = NonNullable<BadgeVariants['variant']>;
export type BadgeColor = NonNullable<BadgeVariants['color']>;
export type BadgeSize = NonNullable<BadgeVariants['size']>;

export type BadgeProps = ComponentProps<'span'> & {
  variant?: BadgeVariant;
  color?: BadgeColor;
  size?: BadgeSize;
};

export const Badge = ({ variant, color, size, className, children, ...props }: BadgeProps) => (
  <span className={badge({ variant, color, size, className })} {...props}>
    {children}
  </span>
);
