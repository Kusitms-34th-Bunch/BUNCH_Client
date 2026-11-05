import type { ComponentProps } from 'react';
import type { VariantProps } from 'tailwind-variants';
import { LineCloseSmallIcon } from '../../../icons';
import { cn, tv } from '../../../utils';

// 보이는 원보다 넓은 32px 터치 영역(design-system-icons.md의 Small 기준): M 16px은 사방 8px, L 24px은 사방 4px
// Figma 호버·눌림 상태 없음
const deleteButton = tv({
  base: [
    'relative flex shrink-0 cursor-pointer touch-manipulation items-center justify-center rounded-full text-icon-inversed',
    "before:absolute before:content-['']",
    'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-border-brand',
  ],
  variants: {
    size: {
      M: 'size-4 before:-inset-2',
      L: 'size-6 before:-inset-1',
    },
    variant: {
      default: 'bg-icon-tertiary',
      overlay: 'bg-overlay-scrim backdrop-blur-[15px]',
    },
  },
  defaultVariants: { size: 'M', variant: 'default' },
});

type DeleteButtonVariants = VariantProps<typeof deleteButton>;

export type DeleteButtonSize = NonNullable<DeleteButtonVariants['size']>;
export type DeleteButtonVariant = NonNullable<DeleteButtonVariants['variant']>;

export type DeleteButtonProps = Omit<
  ComponentProps<'button'>,
  'type' | 'children' | 'aria-label' | 'disabled'
> & {
  /** 접근성 이름(예: "사진 삭제", "지예 삭제"). 보이는 글자가 없어 필수이며 문구는 호출하는 쪽이 결정 */
  label: string;
  /** Figma `Size`: M은 16px 원, L은 24px 원 */
  size?: DeleteButtonSize;
  /** Figma `Variant`: default는 `icon-tertiary` 배경, overlay는 사진 위에 얹는 `overlay-scrim` 배경+블러 15px */
  variant?: DeleteButtonVariant;
};

/**
 * 삭제 버튼(Figma `Delete Button`): 작은 원 안의 X 아이콘 버튼
 * 사진·카드 모서리에 얹어 쓰므로 위치는 호출하는 쪽이 `className`으로 정함(예: `absolute -top-0.75 -right-0.75`, `ml-auto`)
 * X는 Figma처럼 M 6px · L 8px 크기이고 선 굵기는 크기와 상관없이 1px로 고정(`non-scaling-stroke`)
 */
export const DeleteButton = ({
  label,
  size = 'M',
  variant = 'default',
  className,
  ...props
}: DeleteButtonProps) => (
  <button
    type="button"
    aria-label={label}
    className={deleteButton({ size, variant, className })}
    {...props}
  >
    <LineCloseSmallIcon
      aria-hidden="true"
      className={cn(
        size === 'L' ? 'size-4' : 'size-3',
        '[&_path]:stroke-1 [&_path]:[vector-effect:non-scaling-stroke]',
      )}
    />
  </button>
);
