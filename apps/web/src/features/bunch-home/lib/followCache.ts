import type { InfiniteData } from '@tanstack/react-query';
import { toDomainId } from '@/shared/api/client/ids';
import type { Home } from '../model/bunchHome';
import type { RelationPage } from '../model/follows';

export type FollowState = Home['followState'] & RelationPage['items'][number]['followState'];

/** 팔로우를 누른 직후 예상 상태: 공개 번치는 바로 팔로잉, 비공개 번치는 요청됨 */
export const expectedFollowState = (visibility: 'PUBLIC' | 'PRIVATE'): FollowState =>
  visibility === 'PRIVATE' ? 'REQUESTED' : 'FOLLOWING';

/** 다른 번치 홈 캐시의 팔로우 상태 바꾸기. followId를 모르면(undefined) 그대로 둠 */
export const withHomeFollow = (
  home: Home | undefined,
  followState: FollowState,
  followId?: number | null,
): Home | undefined =>
  home && {
    ...home,
    followState,
    ...(followId === undefined ? {} : { followId }),
  };

/**
 * 팔로워·팔로잉 목록 캐시에서 그 번치 행의 팔로우 상태 바꾸기
 * 같은 prefix의 요청 목록(행에 followState 없음)·모르는 모양은 그대로 돌려줌
 */
export const withListFollow = (
  data: unknown,
  targetId: string,
  followState: FollowState,
  followId?: number | null,
): unknown => {
  if (!isRelationPages(data)) return data;
  return {
    ...data,
    pages: data.pages.map((page) => ({
      ...page,
      items: page.items.map((item) =>
        toDomainId(item.bunch.id) === targetId
          ? { ...item, followState, ...(followId === undefined ? {} : { followId }) }
          : item,
      ),
    })),
  };
};

/** 팔로워·팔로잉 목록 캐시에서 그 번치 행의 지금 팔로우 상태(되돌릴 기준값). 없으면 undefined */
export const listFollowOf = (
  data: unknown,
  targetId: string,
): { followState: FollowState; followId: number | null } | undefined => {
  if (!isRelationPages(data)) return undefined;
  for (const page of data.pages) {
    const row = page.items.find((item) => toDomainId(item.bunch.id) === targetId);
    if (row) return { followState: row.followState, followId: row.followId ?? null };
  }
  return undefined;
};

/** 팔로워·팔로잉 목록 캐시에서 그 번치의 공개 여부(다른 번치 홈을 받지 않은 목록 화면용) */
export const listVisibilityOf = (
  data: unknown,
  targetId: string,
): 'PUBLIC' | 'PRIVATE' | undefined => {
  if (!isRelationPages(data)) return undefined;
  for (const page of data.pages) {
    const row = page.items.find((item) => toDomainId(item.bunch.id) === targetId);
    if (row) return row.bunch.visibility;
  }
  return undefined;
};

const isRelationPages = (data: unknown): data is InfiniteData<RelationPage> =>
  typeof data === 'object' &&
  data !== null &&
  'pages' in data &&
  Array.isArray(data.pages) &&
  data.pages.every(
    (page: unknown) =>
      typeof page === 'object' &&
      page !== null &&
      'items' in page &&
      Array.isArray(page.items) &&
      page.items.every(
        (item: unknown) => typeof item === 'object' && item !== null && 'followState' in item,
      ),
  );
