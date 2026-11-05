import { bffApi, requestData } from '@/shared/api/bffApi';
import { bunchHomeResponseSchema, publishedBundlesPageSchema } from '../model/bunchHome';

// 번치 홈 「완성된 번들」은 한 번에 받을 수 있는 최대 쪽 크기만 불러옴(더 불러오기는 UT 이후)
const PUBLISHED_PAGE_SIZE = 50;

const bunchPath = (bunchId: string) => `bunches/${encodeURIComponent(bunchId)}`;

/** 번치 홈 프로필·권한·개수(내가 속하지 않은 번치는 AUTH_002, 없는 번치는 RESOURCE_001) */
export const getBunchHome = (bunchId: string, signal?: AbortSignal) =>
  requestData(
    bffApi.get(`${bunchPath(bunchId)}/home`, { signal: signal ?? null }),
    bunchHomeResponseSchema,
    'bunch home',
  );

/** 발행된 번들 첫 쪽(발행 최신순) */
export const getPublishedBundles = (bunchId: string, signal?: AbortSignal) =>
  requestData(
    bffApi.get(`${bunchPath(bunchId)}/published-bundles`, {
      searchParams: { page: 0, size: PUBLISHED_PAGE_SIZE },
      signal: signal ?? null,
    }),
    publishedBundlesPageSchema,
    'published bundles',
  );
