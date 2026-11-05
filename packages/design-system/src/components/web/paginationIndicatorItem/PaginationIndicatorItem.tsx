import type { ComponentProps } from 'react';
import { cn } from '../../../utils';

const STATES = {
  /** 현재 페이지: 6px, 진한 점 */
  active: 'bg-icon-tertiary size-1.5',
  /** 가까운 페이지: 6px, 연한 점 */
  middle: 'bg-surface-tertiary size-1.5',
  /** 멀리 있어 줄어든 페이지: 4px, 가장 연한 점 */
  far: 'bg-surface-secondary size-1',
} as const;

export type PaginationIndicatorItemState = keyof typeof STATES;

export type PaginationIndicatorItemProps = Omit<ComponentProps<'span'>, 'children'> & {
  /** 점의 상태(Figma `State`): 기본 `active` */
  state?: PaginationIndicatorItemState | undefined;
};

/**
 * 페이지네이션 점 하나(Figma `Pagination Indicator Item`): `active`·`middle`은 6px, `far`는 4px 원
 * 뜻은 `PaginationIndicator`가 읽어 주므로 보조 기술에서는 숨기고 `className`은 점에 적용
 */
export const PaginationIndicatorItem = ({
  state = 'active',
  className,
  ...props
}: PaginationIndicatorItemProps) => (
  <span
    aria-hidden="true"
    className={cn('block shrink-0 rounded-full', STATES[state], className)}
    {...props}
  />
);
