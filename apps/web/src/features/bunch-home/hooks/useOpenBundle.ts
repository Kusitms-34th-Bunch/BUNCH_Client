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

/** 이동 직전 격자 칸 데이터를 상세가 받는 동안 먼저 그리도록 남김(feed feature라 route가 조합) */
export type RememberBundlePreview = (
  _bunchId: string,
  _grid: {
    id: string;
    title: string;
    coverSrc: string;
    bunchName: string;
    bunchImageSrc?: string | undefined;
  },
) => void;

export type GridBundlePreview = Parameters<RememberBundlePreview>[1];

// 상세 응답을 기다리는 최대 시간. 넘으면 그냥 이동(상세가 받고 볼 수 없음을 안내)
const PREFETCH_WAIT_MS = 400;
// 닿을 때 시작한 확인을 누를 때 이어 쓰는 시간. 지나면(스크롤하려고 닿은 뒤 한참 지나 누름) 새로 확인
export const WARM_REUSE_MS = 3000;

type OpenBundleOptions = {
  /** 지금 번치 명의. 모르는 동안(undefined)은 확인 없이 이동 */
  viewerId: string | null | undefined;
  prefetchBundle?: PrefetchBundle | undefined;
  rememberPreview?: RememberBundlePreview | undefined;
  /** 삭제된 번들을 눌렀을 때 그리드 다시 받기 */
  onDeleted: () => void;
};

/**
 * 완성된 번들 칸 → 번들 상세(5.1.5·5.10.1). 상세를 먼저 받아 404(삭제됨)면 이동 대신 「삭제된 번들이에요.」와 그리드 새로고침
 * `warm`은 칸에 손가락이 닿을 때 확인을 시작해 떼기 전에 끝나게 함(`open`이 그 결과를 이어 씀)
 * ponytail: 400ms 안에 답이 없으면 확인 없이 이동, 늦은 404는 상세 화면의 볼 수 없음 안내가 맡음
 */
export function useOpenBundle({
  viewerId,
  prefetchBundle,
  rememberPreview,
  onDeleted,
}: OpenBundleOptions) {
  const router = useRouter();
  // 칸별로 시작한 확인(누를 때 꺼내 쓰고 지움)
  const checks = useRef(new Map<string, { at: number; pending: Promise<boolean> }>());
  // 확인을 기다리는 동안 다시 누르면 무시, 그 사이 화면을 떠나면 이동하지 않음
  const opening = useRef(false);
  const mounted = useRef(true);
  useLayoutEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  // 삭제(404)면 true. 같은 칸의 확인이 이미 시작됐으면 그것을 씀
  const keyOf = (bunchId: string, bundleId: string, viewer: string | null) =>
    `${viewer}:${bunchId}/${bundleId}`;
  const check = (bunchId: string, bundleId: string, viewer: string | null) => {
    const key = keyOf(bunchId, bundleId, viewer);
    const found = checks.current.get(key);
    if (found && Date.now() - found.at < WARM_REUSE_MS) return found.pending;
    if (!prefetchBundle) return undefined;
    const pending = prefetchBundle(bunchId, bundleId, viewer).then(
      () => false,
      (error: unknown) => isApiError(error) && error.status === 404,
    );
    checks.current.set(key, { at: Date.now(), pending });
    return pending;
  };

  const warm = (bunchId: string, bundleId: string) => {
    router.prefetch(BUNCH_HOME_PATHS.bundle(bunchId, bundleId));
    if (viewerId !== undefined) void check(bunchId, bundleId, viewerId);
  };

  // 삭제된 번들이라 이동하지 않았으면 true(누른 칸이 사라지기 전에 부르는 쪽이 초점을 옮김)
  const open = async (
    bunchId: string,
    bundleId: string,
    preview?: GridBundlePreview,
  ): Promise<boolean> => {
    const href = BUNCH_HOME_PATHS.bundle(bunchId, bundleId);
    // 상세가 다 오기 전에 이동하면 칸 데이터(표지·제목)와 번치 정보로 먼저 그림
    const go = () => {
      if (preview) rememberPreview?.(bunchId, preview);
      router.push(href);
    };
    if (!prefetchBundle || viewerId === undefined) {
      go();
      return false;
    }
    if (opening.current) return false;
    opening.current = true;
    const checked = check(bunchId, bundleId, viewerId) ?? Promise.resolve(false);
    // 다음 누름은 새로 확인(받아 둔 상세가 있으면 바로 끝남)
    checks.current.delete(keyOf(bunchId, bundleId, viewerId));
    const timeout = new Promise<false>((resolve) =>
      setTimeout(() => resolve(false), PREFETCH_WAIT_MS),
    );
    const deleted = await Promise.race([checked, timeout]);
    opening.current = false;
    if (!mounted.current) return false;
    if (!deleted) {
      go();
      return false;
    }
    toast(BUNCH_HOME_MESSAGES.bundleDeleted);
    onDeleted();
    return true;
  };

  return { open, warm };
}
