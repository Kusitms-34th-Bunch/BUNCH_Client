import { useRouter } from 'next/navigation';
import { useLayoutEffect, useRef } from 'react';
import { useReducedMotion } from '@/shared/hooks/useReducedMotion';
import type { FeedBundle } from '../lib/types';
import { usePrefetchBundleDetail } from '../queries/bundleDetail';

// 상세 데이터를 기다리는 최대 시간. 넘으면 그냥 이동(받는 중 화면이라 사진 이어 그리기 없이 바뀜)
const DETAIL_PREFETCH_WAIT_MS = 400;

type OpenBundleDetailOptions = {
  /** 지금 번치 명의. 모르는 동안(undefined)은 미리 받지 않음 */
  viewerId: string | null | undefined;
  /** 번들 상세가 쓰는 번치 정보를 미리 받음(다른 기능의 query라 route가 조합) */
  prefetchBunch?: ((_bunchId: string, _viewerId: string | null) => Promise<unknown>) | undefined;
};

/**
 * 피드 카드 → 번들 상세 이동. 상세를 미리 받은 뒤(최대 400ms) 이동
 * 상세가 바로 그려져야 카드 사진이 상세 첫 사진으로 이어짐(AppTransitions hero)
 */
export function useOpenBundleDetail({ viewerId, prefetchBunch }: OpenBundleDetailOptions) {
  const router = useRouter();
  const reducedMotion = useReducedMotion();
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
  // 사진·말풍선 모두 같은 상세(말풍선은 댓글로 바로)라 미리 받은 뒤 이동
  // 이동을 기다리는 동안 다시 누르면 무시하고, 그 사이 화면을 떠나면 이동하지 않음. 동작 줄이기면 전환이 없어 기다리지 않음
  const openingRef = useRef(false);
  const mountedRef = useRef(true);
  useLayoutEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);
  const open = (bundle: FeedBundle, href: string) => {
    if (openingRef.current) return;
    if (reducedMotion) {
      router.push(href);
      return;
    }
    openingRef.current = true;
    void Promise.race([
      prefetch(bundle),
      new Promise((resolve) => setTimeout(resolve, DETAIL_PREFETCH_WAIT_MS)),
    ]).finally(() => {
      openingRef.current = false;
      if (mountedRef.current) router.push(href);
    });
  };

  return { prefetch, open };
}
