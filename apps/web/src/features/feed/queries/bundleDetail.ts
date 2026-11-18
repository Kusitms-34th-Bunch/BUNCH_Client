import { queryOptions, skipToken, useQueryClient } from '@tanstack/react-query';
import { isUnavailableTarget } from '@/shared/api/errorStatus';
import { myProfileQueryOptions } from '@/shared/query/myProfile';
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

/**
 * 다른 화면에서 번들 상세로 가기 전에 지금 볼 수 있는지 서버에 다시 확인(콕한 장소 카드, 기능명세서 8.1.5 로직 1)
 * 판정은 번들 상세 화면과 같음(404·403·400이면 `hidden`). 확인 요청 자체가 실패하면 reject
 * 화면을 연 뒤 삭제·비공개로 바뀌었을 수 있어 캐시가 있어도 다시 받고, 받은 상세는 캐시에 남아 상세가 바로 그려짐
 */
export function useCheckBundleVisible() {
  const queryClient = useQueryClient();
  return async (bunchId: string, bundleId: string): Promise<'visible' | 'hidden'> => {
    const profile = await queryClient.ensureQueryData(myProfileQueryOptions());
    const options = bundleDetailQueryOptions(bunchId, bundleId, profile.bunch?.id ?? null);
    try {
      await queryClient.fetchQuery({ ...options, staleTime: 0 });
      return 'visible';
    } catch (error) {
      if (!isUnavailableTarget(error)) throw error;
      // 볼 수 없게 된 번들의 낡은 상세를 지움(다른 경로로 열 때 옛 내용을 먼저 그리지 않게)
      queryClient.removeQueries({ queryKey: options.queryKey, exact: true });
      return 'hidden';
    }
  };
}
