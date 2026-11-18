import { queryOptions, skipToken, useQueryClient } from '@tanstack/react-query';
import { getBundleDetail } from '../api/bundleDetail';
import { feedKeys } from './keys';

/** 발행 번들 상세. 명의를 알기 전(undefined)에는 요청하지 않음 */
export const bundleDetailQueryOptions = (
  bunchId: string,
  bundleId: string,
  viewerId: string | null | undefined,
) =>
  queryOptions({
    queryKey: feedKeys.detail(bunchId, bundleId, viewerId ?? null),
    queryFn:
      viewerId === undefined
        ? skipToken
        : ({ signal }) => getBundleDetail(bunchId, bundleId, signal),
  });

/** 상세로 가기 전에 상세를 미리 받음(화면 전환이 카드 사진을 상세 첫 사진으로 이으려면 상세가 바로 그려져야 함). 캐시가 있으면 오래돼도 바로 끝남(상세가 다시 받음), 실패는 reject */
export function usePrefetchBundleDetail() {
  const queryClient = useQueryClient();
  return (bunchId: string, bundleId: string, viewerId: string | null) =>
    queryClient.ensureQueryData(bundleDetailQueryOptions(bunchId, bundleId, viewerId));
}
