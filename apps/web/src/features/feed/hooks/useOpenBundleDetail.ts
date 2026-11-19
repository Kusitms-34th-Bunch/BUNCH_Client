import { useRouter } from 'next/navigation';
import type { FeedBundle } from '../lib/types';
import { rememberBundlePreview } from '../lib/bundlePreview';
import { usePrefetchBundleDetail } from '../queries/bundleDetail';

type OpenBundleDetailOptions = {
  /** 지금 번치 명의. 모르는 동안(undefined)은 미리 받지 않음 */
  viewerId: string | null | undefined;
  /** 번들 상세가 쓰는 번치 정보를 미리 받음(다른 기능의 query라 route가 조합) */
  prefetchBunch?: ((_bunchId: string, _viewerId: string | null) => Promise<unknown>) | undefined;
};

/**
 * 피드 카드 → 번들 상세 이동. 손가락이 닿을 때 상세를 미리 받기 시작하고, 누르면 바로 이동
 * 상세가 받는 동안에도 카드 데이터로 첫 사진을 그려 카드 사진이 그 자리로 이어짐(AppTransitions hero)
 */
export function useOpenBundleDetail({ viewerId, prefetchBunch }: OpenBundleDetailOptions) {
  const router = useRouter();
  const prefetchBundleDetail = usePrefetchBundleDetail();
  // 손가락이 닿을 때부터 받아 둠
  const prefetch = (bundle: FeedBundle) =>
    viewerId === undefined
      ? Promise.resolve()
      : Promise.all([
          prefetchBundleDetail(bundle.bunch.id, bundle.id, viewerId),
          prefetchBunch?.(bundle.bunch.id, viewerId),
          // 실패해도 이동은 막지 않음(상세가 다시 받고 실패 안내)
        ]).then(
          () => undefined,
          () => undefined,
        );
  // 사진·말풍선 모두 같은 상세(말풍선은 댓글로 바로). 기다리지 않고 이동하고, 상세는 받는 동안 카드 데이터로 윗부분을 먼저 그림
  const open = (bundle: FeedBundle, href: string) => {
    rememberBundlePreview(bundle);
    void prefetch(bundle);
    router.push(href);
  };

  return { prefetch, open };
}
