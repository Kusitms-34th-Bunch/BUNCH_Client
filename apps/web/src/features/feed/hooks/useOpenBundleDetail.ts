import { useRouter } from 'next/navigation';
import { useEffect, useRef } from 'react';
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
 * 피드 카드 → 번들 상세 이동. 손가락이 닿을 때 상세를 미리 받기 시작하고, 누르면 바로 이동
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
    router.prefetch(FEED_PATHS.bundle(bundle.bunch.id, bundle.id));
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
  // 사진·말풍선 모두 같은 상세(말풍선은 댓글로 바로). 기본은 기다리지 않고 이동하고, 상세는 받는 동안 카드 데이터로 윗부분을 먼저 그림
  // waitMs: 상세를 받을 때까지 그만큼만 기다렸다가 이동(말풍선 진입은 받는 중 화면으로 열리면 댓글로 뒤늦게 넘어가 보여서)
  // 손가락이 닿을 때 시작한 같은 요청을 기다림. 기다리는 동안 다시 누른 것은 무시
  const cancelPending = useRef<(() => void) | null>(null);
  useEffect(() => () => cancelPending.current?.(), []);
  const open = (
    bundle: FeedBundle,
    href: string,
    { waitMs = 0, withComments = false }: { waitMs?: number; withComments?: boolean } = {},
  ) => {
    rememberBundlePreview(bundle);
    const ready = prefetch(bundle, { withComments });
    if (waitMs <= 0) {
      // 기다리던 말풍선 이동이 이 이동 뒤에 따라오지 않게
      cancelPending.current?.();
      router.push(href);
      return;
    }
    if (cancelPending.current) return;
    // 기다리는 사이 다른 화면·앱 탭으로 갔으면(탭 WebView는 숨어도 주소가 그대로) 이동하지 않음
    const from = window.location.href;
    const cancel = () => {
      clearTimeout(timer);
      cancelPending.current = null;
    };
    const go = () => {
      if (cancelPending.current !== cancel) return;
      cancel();
      if (window.location.href === from && document.visibilityState === 'visible')
        router.push(href);
    };
    const timer = setTimeout(go, waitMs);
    cancelPending.current = cancel;
    void ready.then(go);
  };

  return { prefetch, open };
}
