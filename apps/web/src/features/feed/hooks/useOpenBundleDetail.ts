import { useRouter } from 'next/navigation';
import type { FeedBundle } from '../lib/types';
import { FEED_PATHS } from '../constants/paths';
import { rememberBundlePreview } from '../lib/bundlePreview';
import { usePrefetchBundleDetail } from '../queries/bundleDetail';
import { usePrefetchComments } from '../queries/comments';

type OpenBundleDetailOptions = {
  /** 지금 번치 명의. 모르는 동안(undefined)은 미리 받지 않음 */
  viewerId: string | null | undefined;
  /** 번들 상세가 쓰는 번치 정보를 미리 받음(다른 기능의 query라 route가 조합) */
  prefetchBunch?: ((_bunchId: string, _viewerId: string | null) => Promise<unknown>) | undefined;
};

/**
 * 피드 카드 → 번들 상세 이동. 손가락이 닿을 때 상세 데이터를 미리 받기 시작하고, 누르면 바로 이동
 * 상세가 받는 동안에도 카드 데이터로 첫 사진을 그려 카드 사진이 그 자리로 이어짐(AppTransitions hero)
 */
export function useOpenBundleDetail({ viewerId, prefetchBunch }: OpenBundleDetailOptions) {
  const router = useRouter();
  const prefetchBundleDetail = usePrefetchBundleDetail();
  const prefetchComments = usePrefetchComments();
  // 손가락이 닿을 때부터 받아 둠(상세 화면 경로도 함께)
  // withComments: 말풍선 진입은 댓글 목록도(목록이 와야 댓글 위치까지 내려갈 수 있음)
  const prefetch = (
    bundle: FeedBundle,
    { withComments = false }: { withComments?: boolean } = {},
  ) => {
    // 상세는 정적 화면이라 주소째 미리 받으면 누르자마자 열림. 말풍선은 query까지 같은 주소로
    router.prefetch(
      withComments
        ? FEED_PATHS.bundleComments(bundle.bunch.id, bundle.id)
        : FEED_PATHS.bundle(bundle.bunch.id, bundle.id),
    );
    return viewerId === undefined
      ? Promise.resolve()
      : Promise.all([
          prefetchBundleDetail(bundle.bunch.id, bundle.id, viewerId),
          prefetchBunch?.(bundle.bunch.id, viewerId),
          withComments ? prefetchComments(bundle.id, viewerId) : undefined,
          // 실패해도 이동은 막지 않음(상세가 다시 받고 실패 안내)
        ]).then(
          () => undefined,
          () => undefined,
        );
  };
  // 사진·말풍선 모두 기다리지 않고 바로 이동(말풍선은 댓글로). 상세는 받는 동안 카드 데이터로 윗부분을 먼저 그림
  const open = (
    bundle: FeedBundle,
    href: string,
    { withComments = false }: { withComments?: boolean } = {},
  ) => {
    rememberBundlePreview(bundle);
    void prefetch(bundle, { withComments });
    router.push(href);
  };

  return { prefetch, open };
}
