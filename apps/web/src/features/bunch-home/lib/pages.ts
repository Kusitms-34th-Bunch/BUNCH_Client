import type { UseInfiniteQueryResult } from '@tanstack/react-query';

/** 쪽 번호 목록 응답(서버 `page`·`size`·`hasNext`)을 이어서 받는 공통 규칙 */
export const FIRST_PAGE = 0;

/** 목록 끝 이어서 받기(`ListMore`)에 쓰는 infinite query 상태 */
export type ListMoreQuery = Pick<
  UseInfiniteQueryResult,
  'hasNextPage' | 'isFetchingNextPage' | 'isFetchNextPageError' | 'fetchNextPage'
>;

/** 마지막으로 받은 쪽 다음 번호. 끝이면 undefined(TanStack이 다음 쪽 없음으로 봄) */
export const nextPageOf = (last: { hasNext: boolean }, _pages: unknown, lastPage: number) =>
  last.hasNext ? lastPage + 1 : undefined;

/**
 * 받은 쪽을 한 목록으로 합침. 같은 key는 처음 것만 남김
 * ponytail: 쪽 번호 방식이라 받는 사이 앞 항목이 생기면 겹치고(여기서 거름) 사라지면 한 줄이 빠짐, 커서 방식이 생기면 바꿈
 */
export const itemsOfPages = <T>(
  pages: readonly { items: readonly T[] }[],
  keyOf: (_item: T) => number | string,
): T[] => {
  const seen = new Set<number | string>();
  return pages
    .flatMap((page) => page.items)
    .filter((item) => {
      const key = keyOf(item);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
};
