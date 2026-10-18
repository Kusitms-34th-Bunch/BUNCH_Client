import type { ComponentProps, ReactNode } from 'react';
import type { VariantProps } from 'tailwind-variants';
import { tv } from '../../../utils';

// 눌림 오버레이: 글자 아래·배경 위의 -z-10 pseudo 요소(isolate로 쌓임 맥락 분리)
// Warning만 overlay-pressed(20%), 나머지 overlay-hover(10%) — Figma 스크린샷 픽셀 측정값
const button = tv({
  slots: {
    base: [
      'relative isolate inline-flex max-w-full shrink-0 cursor-pointer touch-manipulation items-center justify-center rounded-r4',
      'before:pointer-events-none before:absolute before:inset-0 before:-z-10 before:rounded-r4 before:bg-overlay-hover before:opacity-0',
      'not-disabled:active:before:opacity-100',
      'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-border-brand',
      'disabled:cursor-not-allowed disabled:bg-surface-disabled disabled:text-text-disabled',
    ],
    icon: 'inline-flex shrink-0 items-center justify-center [&>svg]:size-full',
    label: 'min-w-0 truncate',
  },
  variants: {
    variant: {
      primary: { base: 'bg-surface-inversed text-text-inversed' },
      secondary: { base: 'bg-surface-tertiary text-text-primary' },
      // 비활성에서도 테두리 자리 유지(크기 변동 방지)
      tertiary: {
        base: 'border border-border-secondary bg-surface-primary text-text-primary disabled:border-transparent',
      },
      warning: { base: 'bg-surface-danger text-text-inversed before:bg-overlay-pressed' },
      brand: { base: 'bg-surface-brand text-text-inversed' },
      brandSubtle: { base: 'bg-surface-brand-subtle-1 text-text-brand' },
    },
    size: {
      lg: { base: 'h-s18 gap-s4 px-s12 typography-label-l', icon: 'size-6' },
      md: { base: 'h-s16 gap-s4 px-s8 typography-label-m', icon: 'size-5' },
      sm: { base: 'h-s14 gap-s3 px-s6 typography-label-s', icon: 'size-4' },
    },
  },
  defaultVariants: { variant: 'primary', size: 'lg' },
});

type ButtonVariants = VariantProps<typeof button>;

export type ButtonVariant = NonNullable<ButtonVariants['variant']>;
export type ButtonSize = NonNullable<ButtonVariants['size']>;

export type ButtonProps = ComponentProps<'button'> & {
  /** 접근성 이름이 되는 글자(아이콘 전용 버튼은 제공하지 않음) */
  children: ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** 글자 앞 장식 아이콘(접근성 이름 제외) */
  leftIcon?: ReactNode;
  /** 글자 뒤 장식 아이콘(접근성 이름 제외) */
  rightIcon?: ReactNode;
};

export const Button = ({
  variant,
  size,
  leftIcon,
  rightIcon,
  type = 'button',
  className,
  children,
  ...props
}: ButtonProps) => {
  const { base, icon, label } = button({ variant, size });

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
