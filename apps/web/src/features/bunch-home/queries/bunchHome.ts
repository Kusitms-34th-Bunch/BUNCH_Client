import { queryOptions, skipToken } from '@tanstack/react-query';
import { sharedKeys } from '@/shared/query/keys';
import { getBunchHome, getDraftBundles, getPublishedBundles } from '../api/bunchHome';

/** 번치 홈 프로필·개수. 번치를 아직 모르면 요청하지 않음(skipToken) */
export const bunchHomeQueryOptions = (bunchId: string | undefined) =>
  queryOptions({
    queryKey: sharedKeys.bunchHome(bunchId),
    queryFn: bunchId ? ({ signal }) => getBunchHome(bunchId, signal) : skipToken,
  });

/** 발행된 번들 목록. 번들 발행 뒤에는 번치 홈 key 전체와 함께 무효화됨(`sharedKeys.bunchHomeScope`) */
export const publishedBundlesQueryOptions = (bunchId: string | undefined) =>
  queryOptions({
    queryKey: sharedKeys.publishedBundles(bunchId),
    queryFn: bunchId ? ({ signal }) => getPublishedBundles(bunchId, signal) : skipToken,
  });

/** 작성 중인 번들 목록. 초안을 만들거나 나가거나 삭제하거나 발행한 뒤에는 번치 홈 key 전체와 함께 무효화됨 */
export const draftBundlesQueryOptions = (bunchId: string | undefined) =>
  queryOptions({
    queryKey: sharedKeys.draftBundles(bunchId),
    queryFn: bunchId ? ({ signal }) => getDraftBundles(bunchId, signal) : skipToken,
  });
