import type { ComponentProps } from 'react';
import type { VariantProps } from 'tailwind-variants';
import { tv } from '../../../utils';

const colorBadge = tv({
  base: 'px-padding-p4 py-padding-p2 inline-flex max-w-full shrink-0 items-center justify-center overflow-clip whitespace-nowrap',
  variants: {
    variant: { weak: '', fill: '' },
    color: { brand: '', gray: '', pink: '', green: '', orange: '' },
    size: {
      lg: 'rounded-r4 typography-body-3-regular',
      md: 'rounded-r3 typography-caption-1-regular',
    },
  },
  compoundVariants: [
    { variant: 'weak', color: 'brand', class: 'bg-surface-brand-subtle-1 text-text-brand' },
    { variant: 'weak', color: 'gray', class: 'bg-surface-secondary text-text-tertiary' },
    { variant: 'weak', color: 'pink', class: 'bg-chip-pink-bg text-chip-pink-fg' },
    { variant: 'weak', color: 'green', class: 'bg-chip-green-bg text-chip-green-fg' },
    { variant: 'weak', color: 'orange', class: 'bg-chip-orange-bg text-chip-orange-fg' },
    { variant: 'fill', color: 'brand', class: 'bg-surface-brand text-text-inversed' },
    { variant: 'fill', color: 'gray', class: 'bg-surface-inversed-lighter text-text-inversed' },
    { variant: 'fill', color: 'pink', class: 'bg-chip-pink-fg text-chip-pink-bg' },
    { variant: 'fill', color: 'green', class: 'bg-chip-green-fg text-chip-green-bg' },
    { variant: 'fill', color: 'orange', class: 'bg-chip-orange-fg text-chip-orange-bg' },
  ],
  defaultVariants: { variant: 'weak', color: 'gray', size: 'lg' },
});

type ColorBadgeVariants = VariantProps<typeof colorBadge>;

export type ColorBadgeVariant = NonNullable<ColorBadgeVariants['variant']>;
export type ColorBadgeColor = NonNullable<ColorBadgeVariants['color']>;
export type ColorBadgeSize = NonNullable<ColorBadgeVariants['size']>;

export type ColorBadgeProps = ComponentProps<'span'> & {
  variant?: ColorBadgeVariant;
  color?: ColorBadgeColor;
  size?: ColorBadgeSize;
};

export const ColorBadge = ({
  variant,
  color,
  size,
  className,
  children,
  ...props
}: ColorBadgeProps) => (
  <span className={colorBadge({ variant, color, size, className })} {...props}>
    {children}
  </span>
);
