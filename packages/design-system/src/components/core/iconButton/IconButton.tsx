import type { ComponentProps, ReactNode } from 'react';
import type { VariantProps } from 'tailwind-variants';
import { tv } from '../../../utils';

// 배경 있는 버튼(Figma `Icon Button`): 40px 원형, 누르면 버튼 위에 덮개를 얹어 아이콘까지 함께 어둡게 하고 0.95(40px 기준 2px)로 줄어듦
const FILLED = [
  'press-scale-small size-10 rounded-full focus-visible:outline-offset-2',
  'before:bg-overlay-hover press-overlay before:z-10 before:rounded-full',
  'active:before:opacity-100',
];

const iconButton = tv({
  base: [
    'relative isolate inline-flex shrink-0 cursor-pointer touch-manipulation items-center justify-center',
    // 윤곽선 간격은 변형마다 지정(plain은 쓰는 곳의 기존 모양에 맞춰 className으로 지정)
    'focus-visible:outline-border-brand focus-visible:outline-2',
  ],
  variants: {
    variant: {
      subtle: [...FILLED, 'bg-surface-primary text-icon-primary'],
      outline: [...FILLED, 'bg-surface-primary text-icon-primary border-border-tertiary border'],
      primary: [...FILLED, 'bg-surface-inversed text-icon-inversed'],
      // 배경 없는 아이콘 버튼(Figma 8311:57033): 크기는 아이콘대로, 누르는 동안 아이콘 0.917과 뒤 배경 36×36(press-icon-overlay)
      // 색(text-icon-*)과 누르는 범위(before:-inset-*, 24px 아이콘이면 before:-inset-2로 40px)는 쓰는 곳이 className으로 정함
      plain: [
        'rounded-full before:absolute',
        'disabled:cursor-not-allowed disabled:opacity-(--semantic-opacity-disabled)',
      ],
    },
    // plain의 눌림: 뒤로 가기는 배경 없이 흐려짐(fade), 그 밖은 뒤 배경(overlay)
    press: {
      overlay: '',
      fade: '',
    },
  },
  // fade에 overlay가 함께 붙으면 뒤로 가기에도 배경이 깔려 둘 중 하나만 적용
  compoundVariants: [
    { variant: 'plain', press: 'overlay', class: 'press-icon-overlay' },
    { variant: 'plain', press: 'fade', class: 'press-icon-fade' },
  ],
  defaultVariants: { variant: 'subtle', press: 'overlay' },
});

export type IconButtonVariant = NonNullable<VariantProps<typeof iconButton>['variant']>;
export type IconButtonPress = NonNullable<VariantProps<typeof iconButton>['press']>;

// 비활성은 배경 있는 버튼에 Figma 모양이 없어 `plain`에서만 씀(흐림 40%)
export type IconButtonProps = Omit<ComponentProps<'button'>, 'children' | 'aria-label'> & {
  /** 아이콘만 있는 버튼이라 접근성 이름 필수(예: "다음 달") */
  'aria-label': string;
  /** 버튼 안의 아이콘(Figma는 Large 24px, 장식이라 스크린 리더에서는 숨겨짐) */
  children: ReactNode;
  /** 모양(Figma `Variant`): 흰 바탕 `subtle`, 테두리가 있는 `outline`, 어두운 바탕 `primary`, 배경 없는 `plain`(헤더·카드의 아이콘) */
  variant?: IconButtonVariant | undefined;
  /** `plain`의 눌림: 뒤 배경 `overlay`(기본), 배경 없이 흐려지는 `fade`(뒤로 가기) */
  press?: IconButtonPress | undefined;
};

/**
 * 아이콘 버튼(Figma `Icon Button`): 40px 원형, Subtle·Outline·Primary × Default·Pressed. 배경 없는 `plain`은 화면의 아이콘 버튼(헤더 뒤로 가기·닫기, 더보기, 복사 등)
 * 누르는 동작은 `onClick`으로 호출하는 쪽이 정하고 `className`은 버튼에 적용
 */
export const IconButton = ({
  type = 'button',
  variant,
  press,
  className,
  children,
  ...props
}: IconButtonProps) => (
  <button type={type} className={iconButton({ variant, press, className })} {...props}>
    <span aria-hidden="true" className="inline-flex">
      {children}
    </span>
  </button>
);
