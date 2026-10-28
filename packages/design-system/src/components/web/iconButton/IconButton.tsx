import type { ComponentProps, ReactNode } from 'react';
import type { VariantProps } from 'tailwind-variants';
import { tv } from '../../../utils';

const iconButton = tv({
  base: [
    'relative isolate inline-flex size-10 shrink-0 cursor-pointer touch-manipulation items-center justify-center rounded-full',
    // 눌림은 버튼 위에 겹쳐 아이콘까지 함께 어두워지게 처리, 다른 버튼과 같은 75ms ease-out 전환(동작 줄이기에서는 끔)
    'before:bg-overlay-hover before:pointer-events-none before:absolute before:inset-0 before:z-10 before:rounded-full before:opacity-0 before:transition-opacity before:duration-75 before:ease-out motion-reduce:before:transition-none',
    'active:before:opacity-100',
    'focus-visible:outline-border-brand focus-visible:outline-2 focus-visible:outline-offset-2',
  ],
  variants: {
    variant: {
      subtle: 'bg-surface-primary text-icon-primary',
      outline: 'bg-surface-primary text-icon-primary border-border-tertiary border',
      primary: 'bg-surface-inversed text-icon-inversed',
    },
  },
  defaultVariants: { variant: 'subtle' },
});

export type IconButtonVariant = NonNullable<VariantProps<typeof iconButton>['variant']>;

// 비활성은 Figma에 모양이 없어 `disabled`를 받지 않음(정해지면 추가)
export type IconButtonProps = Omit<
  ComponentProps<'button'>,
  'children' | 'aria-label' | 'disabled'
> & {
  /** 아이콘만 있는 버튼이라 접근성 이름 필수(예: "다음 달") */
  'aria-label': string;
  /** 버튼 안의 아이콘(Figma는 Large 24px, 장식이라 스크린 리더에서는 숨겨짐) */
  children: ReactNode;
  /** 모양(Figma `Variant`): 흰 바탕 `subtle`, 테두리가 있는 `outline`, 어두운 바탕 `primary` */
  variant?: IconButtonVariant | undefined;
};

/**
 * 아이콘 버튼(Figma `Icon Button`): 40px 원형, Subtle·Outline·Primary × Default·Pressed
 * 누르는 동작은 `onClick`으로 호출하는 쪽이 정하고 `className`은 버튼에 적용
 */
export const IconButton = ({
  type = 'button',
  variant,
  className,
  children,
  ...props
}: IconButtonProps) => (
  <button type={type} className={iconButton({ variant, className })} {...props}>
    <span aria-hidden="true" className="inline-flex">
      {children}
    </span>
  </button>
);
