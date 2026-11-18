import { isApiError } from '@app/api-core';
import { toast } from '@app/design-system';
import { useRouter } from 'next/navigation';
import { useLayoutEffect, useRef } from 'react';
import { BUNCH_HOME_MESSAGES } from '../constants/messages';
import { BUNCH_HOME_PATHS } from '../constants/paths';

/** 번들 상세를 미리 받음(feed feature의 query라 route가 조합). 없는 번들이면 reject */
export type PrefetchBundle = (
  _bunchId: string,
  _bundleId: string,
  _viewerId: string | null,
) => Promise<unknown>;

// 상세 응답을 기다리는 최대 시간. 넘으면 그냥 이동(상세가 받고 볼 수 없음을 안내)
const PREFETCH_WAIT_MS = 400;

type OpenBundleOptions = {
  /** 지금 번치 명의. 모르는 동안(undefined)은 확인 없이 이동 */
  viewerId: string | null | undefined;
  prefetchBundle?: PrefetchBundle | undefined;
  /** 삭제된 번들을 눌렀을 때 그리드 다시 받기 */
  onDeleted: () => void;
};

/**
 * 완성된 번들 칸 → 번들 상세(5.1.5·5.10.1). 상세를 먼저 받아 404(삭제됨)면 이동 대신 「삭제된 번들이에요.」와 그리드 새로고침
 * ponytail: 400ms 안에 답이 없으면 확인 없이 이동, 늦은 404는 상세 화면의 볼 수 없음 안내가 맡음
 */
export function useOpenBundle({ viewerId, prefetchBundle, onDeleted }: OpenBundleOptions) {
  const router = useRouter();
  // 확인을 기다리는 동안 다시 누르면 무시, 그 사이 화면을 떠나면 이동하지 않음
  const opening = useRef(false);
  const mounted = useRef(true);
  useLayoutEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  // 삭제된 번들이라 이동하지 않았으면 true(누른 칸이 사라지기 전에 부르는 쪽이 초점을 옮김)
  return async (bunchId: string, bundleId: string): Promise<boolean> => {
    const href = BUNCH_HOME_PATHS.bundle(bunchId, bundleId);
    if (!prefetchBundle || viewerId === undefined) {
      router.push(href);
      return false;
    }
    if (opening.current) return false;
    opening.current = true;
    const checked = prefetchBundle(bunchId, bundleId, viewerId).then(
      () => false,
      (error: unknown) => isApiError(error) && error.status === 404,
    );
    const timeout = new Promise<false>((resolve) =>
      setTimeout(() => resolve(false), PREFETCH_WAIT_MS),
    );
    const deleted = await Promise.race([checked, timeout]);
    opening.current = false;
    if (!mounted.current) return false;
    if (!deleted) {
      router.push(href);
      return false;
    }
    toast(BUNCH_HOME_MESSAGES.bundleDeleted);
    onDeleted();
    return true;
  };
}
