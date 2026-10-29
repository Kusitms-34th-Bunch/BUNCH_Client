import type { PaginationIndicatorItemState } from '../paginationIndicatorItem';

/** 한 번에 보이는 점의 최대 개수(Figma `dot1~6`) */
export const MAX_DOTS = 6;

/**
 * 입력을 정수 페이지 수와 1~전체 사이의 현재 페이지로 맞춤
 * 숫자가 아니거나 무한한 값은 쓸 수 없는 값으로 보고 전체는 0페이지, 현재는 1페이지로 처리
 */
export const normalizePages = (total: number, current: number) => {
  const count = Number.isFinite(total) ? Math.max(0, Math.floor(total)) : 0;
  const rawPage = Number.isFinite(current) ? Math.floor(current) : 1;
  return { count, page: Math.min(Math.max(rawPage, 1), Math.max(count, 1)) };
};

/**
 * 페이지 수와 현재 페이지로 점 6개의 상태를 정하는 규칙
 * 페이지가 6개 이하면 점마다 한 페이지이고, 그보다 많으면 Figma `CurrentPage` 1~6의 여섯 모양을 따름
 */
export const getPaginationDotStates = (
  total: number,
  current: number,
): PaginationIndicatorItemState[] => {
  const { count, page } = normalizePages(total, current);
  if (count === 0) return [];

  if (count <= MAX_DOTS) {
    return Array.from({ length: count }, (_, index) => (index + 1 === page ? 'active' : 'middle'));
  }

  // 앞쪽 3페이지는 왼쪽부터 채우고, 중간은 네 번째 점에 두며, 끝에서 두 번째·마지막은 오른쪽 끝으로 붙음
  const activeIndex = page <= 3 ? page - 1 : page === count ? 5 : page === count - 1 ? 4 : 3;
  const states: PaginationIndicatorItemState[] = Array.from({ length: MAX_DOTS }, () => 'middle');
  states[activeIndex] = 'active';
  // 앞이나 뒤에 더 있는 페이지는 가장자리 점을 4px로 줄여 알림
  if (page > 3) states[0] = 'far';
  if (page < count) states[MAX_DOTS - 1] = 'far';
  return states;
};
