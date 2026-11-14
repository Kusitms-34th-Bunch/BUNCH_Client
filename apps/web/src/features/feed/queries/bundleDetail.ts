import { queryOptions, skipToken } from '@tanstack/react-query';
import { getBundleDetail } from '../api/bundleDetail';

// 상세의 볼 수 있음·권한·좋아요 여부가 지금 번치(명의)에 따라 달라 명의를 key에 둠, 소속 번치가 없으면 null
export const bundleDetailKeys = {
  detail: (bunchId: string, bundleId: string, viewerId: string | null) =>
    ['bundle-detail', bunchId, bundleId, viewerId] as const,
};

/** 발행 번들 상세. 명의를 알기 전(undefined)에는 요청하지 않음 */
export const bundleDetailQueryOptions = (
  bunchId: string,
  bundleId: string,
  viewerId: string | null | undefined,
) =>
  queryOptions({
    queryKey: bundleDetailKeys.detail(bunchId, bundleId, viewerId ?? null),
    queryFn:
      viewerId === undefined
        ? skipToken
        : ({ signal }) => getBundleDetail(bunchId, bundleId, signal),
  });
