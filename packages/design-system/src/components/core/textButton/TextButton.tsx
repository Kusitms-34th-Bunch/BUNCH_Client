import type { ComponentProps, ReactNode } from 'react';
import type { VariantProps } from 'tailwind-variants';
import { tv } from '../../../utils';

// 눌림 오버레이: 글자 아래의 -z-10 pseudo 요소(isolate로 쌓임 맥락 분리). 세 variant 모두 overlay-hover(10%)
const textButton = tv({
  slots: {
    base: [
      'relative isolate inline-flex max-w-full shrink-0 cursor-pointer touch-manipulation items-center justify-center rounded-r4',
      'before:pointer-events-none before:absolute before:inset-0 before:-z-10 before:rounded-r4 before:bg-overlay-hover before:opacity-0',
      'not-disabled:active:before:opacity-100',
      'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-border-brand',
      'disabled:cursor-not-allowed disabled:text-text-disabled',
    ],
    icon: 'inline-flex shrink-0 items-center justify-center [&>svg]:size-full',
    label: 'min-w-0 truncate',
  },
  variants: {
    variant: {
      primary: { base: 'text-text-brand' },
      secondary: { base: 'text-text-secondary' },
      warning: { base: 'text-system-fail-fg' },
    },
    size: {
      lg: { base: 'h-s18 gap-s4 px-s12 typography-label-l', icon: 'size-6' },
      md: { base: 'h-s16 gap-s4 px-s8 typography-label-m', icon: 'size-5' },
      sm: { base: 'h-s14 gap-s3 px-s6 typography-label-s', icon: 'size-4' },
    },
  },
  defaultVariants: { variant: 'secondary', size: 'lg' },
});

type TextButtonVariants = VariantProps<typeof textButton>;

export type TextButtonVariant = NonNullable<TextButtonVariants['variant']>;
export type TextButtonSize = NonNullable<TextButtonVariants['size']>;

export type TextButtonProps = ComponentProps<'button'> & {
  /** 접근성 이름이 되는 글자 */
  children: ReactNode;
  variant?: TextButtonVariant;
  size?: TextButtonSize;
  /** 글자 앞 장식 아이콘(접근성 이름 제외) */
  leftIcon?: ReactNode;
  /** 글자 뒤 장식 아이콘(접근성 이름 제외) */
  rightIcon?: ReactNode;
};

export const TextButton = ({
  variant,
  size,
  leftIcon,
  rightIcon,
  type = 'button',
  className,
  children,
  ...props
}: TextButtonProps) => {
  const { base, icon, label } = textButton({ variant, size });

  return (
    <button type={type} className={base({ className })} {...props}>
      {leftIcon ? (
        <span aria-hidden="true" className={icon()}>
          {leftIcon}
        </span>
      ) : null}
      <span className={label()}>{children}</span>
      {rightIcon ? (
        <span aria-hidden="true" className={icon()}>
          {rightIcon}
        </span>
      ) : null}
    </button>
  );
};
