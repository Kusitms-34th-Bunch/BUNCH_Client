import type { ComponentProps } from 'react';
import type { VariantProps } from 'tailwind-variants';
import { tv } from '../../../utils';

// 받는 중 자리표시. 크기는 호출자가 className으로 실제 요소와 같게 줌
// 은은하게 깜빡이고(Tailwind animate-pulse), 동작 줄이기 설정이면 멈춤(motion.md 「반복 재생은 정지」)
const skeleton = tv({
  base: 'block shrink-0 motion-safe:animate-pulse',
  variants: {
    shape: {
      // 글줄·버튼·칩처럼 모서리가 둥근 자리
      rect: 'rounded-r2',
      // 원(프로필 사진)·알약(칩): 크기가 같으면 원, 가로가 길면 알약
      round: 'rounded-full',
      // 사진 칸처럼 모서리 없는 자리
      block: '',
    },
    tone: {
      default: 'bg-surface-secondary',
      // 실제 빈 자리가 더 진한 회색일 때(사진함 빈 칸) 또는 회색 배경 위
      strong: 'bg-surface-tertiary',
    },
  },
  defaultVariants: { shape: 'rect', tone: 'default' },
});

type SkeletonVariants = VariantProps<typeof skeleton>;

export type SkeletonShape = NonNullable<SkeletonVariants['shape']>;
export type SkeletonTone = NonNullable<SkeletonVariants['tone']>;

export type SkeletonProps = Omit<ComponentProps<'span'>, 'children'> & {
  shape?: SkeletonShape;
  tone?: SkeletonTone;
};

/**
 * 내용을 받는 동안 그 자리를 채우는 회색 상자
 * 화면 읽기 프로그램에는 숨기므로, 받는 중 안내는 쓰는 쪽의 상태 영역(`role="status"`)이 맡음
 * `span`이라 글줄 안(`p`·`button`)에도 넣을 수 있음
 */
export const Skeleton = ({ shape, tone, className, ...props }: SkeletonProps) => (
  // aria-hidden은 props 뒤에 둬 호출자가 덮어쓰지 못하게 함(늘 화면 읽기 프로그램에 숨김)
  <span {...props} aria-hidden="true" className={skeleton({ shape, tone, className })} />
);
