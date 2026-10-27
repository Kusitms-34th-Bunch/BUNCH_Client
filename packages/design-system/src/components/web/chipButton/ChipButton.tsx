import type { ComponentProps } from 'react';
import type { VariantProps } from 'tailwind-variants';
import {
  LineChevronDownMediumIcon,
  LineChevronDownSmallIcon,
  LineCloseMediumIcon,
  LineCloseSmallIcon,
} from '../../../icons';
import { tv } from '../../../utils';

// 눌림이 아닌 호버만 Figma에 있음: 검정 10%(overlay-hover)를 배경 위·글자 아래(-z-10 pseudo, isolate)에 덮음, 75ms ease-out
// Figma 실측: Solid 호버 #f5f5f5→#dcdcdc, Avatar 호버는 흰색 기준 #e5e5e5(기본 #f5f5f5와 다름), Outline 호버는 흰색 그대로
// 터치 영역은 after로 위아래만 44px까지 넓힘(가로는 옆 칩과 겹치지 않게 그대로)
const chipButton = tv({
  base: [
    'relative isolate inline-flex shrink-0 cursor-pointer touch-manipulation items-center justify-center gap-s2 rounded-full whitespace-nowrap typography-body-2-regular',
    'before:pointer-events-none before:absolute before:inset-0 before:-z-10 before:rounded-[inherit] before:bg-overlay-hover before:opacity-0 before:transition-opacity before:duration-75 before:ease-out motion-reduce:before:transition-none',
    "after:absolute after:inset-x-0 after:content-['']",
    'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-border-brand',
  ],
  variants: {
    size: {
      S: 'h-8 px-s5 after:-inset-y-1.5',
      M: 'h-9 px-s5 after:-inset-y-1',
      L: 'h-9.5 px-s6 after:-inset-y-[3px]',
    },
    variant: {
      solid: '',
      outline: 'border border-border-tertiary',
      avatar: '',
    },
    selected: {
      true: 'bg-surface-inversed text-text-inversed',
      false: 'text-text-tertiary',
    },
  },
  compoundVariants: [
    { variant: 'solid', selected: false, class: 'bg-surface-secondary hover:before:opacity-100' },
    { variant: 'outline', selected: false, class: 'bg-surface-primary' },
    {
      variant: 'avatar',
      selected: false,
      class: 'bg-surface-secondary hover:bg-surface-primary hover:before:opacity-100',
    },
    // Figma border-strong(#25282d)은 토큰이 없고 surface-inversed와 같은 값
    { variant: 'outline', selected: true, class: 'border-surface-inversed' },
    { variant: 'avatar', size: 'S', class: 'pl-s2 pr-s4' },
    { variant: 'avatar', size: 'M', class: 'pl-s3 pr-s4' },
    { variant: 'avatar', size: 'L', class: 'pl-s4 pr-s5' },
  ],
  defaultVariants: { size: 'S', variant: 'solid', selected: false },
});

type ChipButtonVariants = VariantProps<typeof chipButton>;

export type ChipButtonSize = NonNullable<ChipButtonVariants['size']>;
export type ChipButtonVariant = NonNullable<ChipButtonVariants['variant']>;

export type ChipButtonProps = Omit<ComponentProps<'button'>, 'disabled' | 'type'> & {
  /** 칩에 보일 글자(접근성 이름). 예: "서울특별시" */
  children: string;
  /** Figma `Size` S 32px · M 36px · L 38px */
  size?: ChipButtonSize;
  /** Figma `Variant`: solid(회색 채움) · outline(흰 배경+테두리) · avatar(왼쪽 24px 원 이미지) */
  variant?: ChipButtonVariant;
  /** 선택됨(Figma `State=Selected`): 어두운 배경+흰 글자. 값을 주면(`true`·`false`) 필터·토글 칩으로 보고 `aria-pressed`로 전달하고, 생략하면 `aria-pressed` 없이 일반·드롭다운 트리거 칩 */
  selected?: boolean;
  /** 글자 뒤에 `(숫자)`로 붙는 개수(Figma `showCount`) */
  count?: number | string;
  /** 왼쪽 닫기(×) 아이콘(Figma `leftIcon`). avatar에서는 쓰지 않음 */
  leftIcon?: boolean;
  /** 오른쪽 아래 화살표(chevron-down) 아이콘(Figma `rightIcon`) */
  rightIcon?: boolean;
  /** avatar의 24px 원 이미지 주소. 없으면 배경색 원만 보임. 장식이라 접근성 이름에는 쓰지 않음 */
  avatarSrc?: string | undefined;
};

/**
 * 칩 버튼(Figma `ChipButton`): 필터·선택용 알약 모양 버튼
 * 전체가 하나의 `<button>`이고 아이콘·아바타는 장식(`aria-hidden`)이라 접근성 이름은 글자와 개수만
 * 필터·토글 칩은 `selected={boolean}`을 명시하고, 드롭다운을 여는 칩은 `selected`를 생략한 채 `aria-haspopup`·`aria-expanded`를 전달
 */
export const ChipButton = ({
  className,
  children,
  size = 'S',
  variant = 'solid',
  selected,
  count,
  leftIcon = false,
  rightIcon = false,
  avatarSrc,
  ...props
}: ChipButtonProps) => {
  const large = size === 'L';
  const CloseIcon = large ? LineCloseMediumIcon : LineCloseSmallIcon;
  const ChevronIcon = large ? LineChevronDownMediumIcon : LineChevronDownSmallIcon;

  return (
    <button
      type="button"
      aria-pressed={selected}
      className={chipButton({ size, variant, selected: selected === true, className })}
      {...props}
    >
      {variant === 'avatar' ? (
        <span
          aria-hidden="true"
          className="border-border-tertiary bg-surface-brand-subtle-2 relative size-6 shrink-0 overflow-hidden rounded-full border"
        >
          {avatarSrc ? (
            <img src={avatarSrc} alt="" className="absolute inset-0 size-full object-cover" />
          ) : null}
        </span>
      ) : leftIcon ? (
        <CloseIcon aria-hidden="true" className="shrink-0" />
      ) : null}
      <span className="inline-flex items-center gap-0.5">
        {children}
        {count !== undefined ? (
          <span className={large ? 'typography-body-1-regular' : undefined}>({count})</span>
        ) : null}
      </span>
      {rightIcon ? <ChevronIcon aria-hidden="true" className="shrink-0" /> : null}
    </button>
  );
};
