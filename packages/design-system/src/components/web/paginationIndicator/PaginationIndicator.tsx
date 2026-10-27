import type { ComponentProps } from 'react';
import { cn } from '../../../utils';
import { PaginationIndicatorItem } from '../paginationIndicatorItem';
import { getPaginationDotStates, normalizePages } from './paginationDots.internal';

export type PaginationIndicatorProps = Omit<ComponentProps<'div'>, 'children' | 'role'> & {
  /** 전체 페이지 수 */
  total: number;
  /** 현재 페이지(1부터, 범위를 벗어나면 가장 가까운 페이지로 맞춤) */
  current: number;
  /** 보조 기술이 읽는 글자(기본 "{현재} / {전체}") */
  label?: string | undefined;
};

/**
 * 페이지네이션 인디케이터(Figma `Pagination Indicator`): 점 최대 6개로 현재 위치를 보여 주는 표시
 * 점은 4px 간격이고 `className`은 점 묶음에 적용
 */
export const PaginationIndicator = ({
  total,
  current,
  label,
  className,
  ...props
}: PaginationIndicatorProps) => {
  const states = getPaginationDotStates(total, current);
  if (states.length === 0) return null;
  const { count, page } = normalizePages(total, current);

  return (
    <div
      role="img"
      // 빈 문자열 label은 이름 없는 이미지가 되므로 기본 글자로 대체
      aria-label={label || `${page} / ${count}`}
      className={cn('gap-s2 flex items-center', className)}
      {...props}
    >
      {states.map((state, index) => (
        <PaginationIndicatorItem key={index} state={state} />
      ))}
    </div>
  );
};
