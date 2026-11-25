import { isApiError } from '@app/api-core';
import { toast } from '@app/design-system';
import { useRouter } from 'next/navigation';
import { useRef } from 'react';
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

// 닿을 때 시작한 확인을 누를 때 이어 쓰는 시간. 지나면(스크롤하려고 닿은 뒤 한참 지나 누름) 새로 확인
export const WARM_REUSE_MS = 3000;
// 같은 칸을 다시 눌러도 이동하지 않는 시간(전환이 끝나기 전 두 번째 누름)
const REPEAT_PUSH_MS = 1000;

type OpenBundleOptions = {
  /** 지금 번치 명의. 모르는 동안(undefined)은 확인 없이 이동 */
  viewerId: string | null | undefined;
  prefetchBundle?: PrefetchBundle | undefined;
  rememberPreview?: RememberBundlePreview | undefined;
  /** 삭제된 번들을 눌렀을 때 그리드 다시 받기 */
  onDeleted: () => void;
};

/**
 * 완성된 번들 칸 → 번들 상세(5.1.5·5.10.1). 누르면 기다리지 않고 바로 이동(피드와 같음, #532·#568)
 * `warm`은 칸에 손가락이 닿을 때 상세 확인을 시작하고, 누를 때 이미 404(삭제됨)로 끝났으면 이동 대신 「삭제된 번들이에요.」와 그리드 새로고침
 * 누른 뒤에 오는 404는 상세 화면의 볼 수 없음 안내가 맡음
 */
export function useOpenBundle({
  viewerId,
  prefetchBundle,
  rememberPreview,
  onDeleted,
}: OpenBundleOptions) {
  const router = useRouter();
  // 칸별로 시작한 확인(누를 때 꺼내 쓰고 지움)
  // deleted: 확인이 끝났으면 그 결과(삭제면 true), 아직이면 undefined
  const checks = useRef(new Map<string, { at: number; deleted?: boolean }>());
  // 빠르게 두 번 누르면 한 번만 이동(같은 주소가 기록에 두 번 쌓이지 않게)
  const lastPush = useRef<{ href: string; at: number }>(undefined);

  // 삭제(404)면 true. 같은 칸의 확인이 이미 시작됐으면 그것을 씀
  const keyOf = (bunchId: string, bundleId: string, viewer: string | null) =>
    `${viewer}:${bunchId}/${bundleId}`;
  const check = (bunchId: string, bundleId: string, viewer: string | null) => {
    const key = keyOf(bunchId, bundleId, viewer);
    const found = checks.current.get(key);
    if ((found && Date.now() - found.at < WARM_REUSE_MS) || !prefetchBundle) return;
    const entry: { at: number; deleted?: boolean } = { at: Date.now() };
    checks.current.set(key, entry);
    void prefetchBundle(bunchId, bundleId, viewer).then(
      () => {
        entry.deleted = false;
      },
      (error: unknown) => {
        entry.deleted = isApiError(error) && error.status === 404;
      },
    );
  };

  const warm = (bunchId: string, bundleId: string) => {
    router.prefetch(BUNCH_HOME_PATHS.bundle(bunchId, bundleId));
    if (viewerId !== undefined) check(bunchId, bundleId, viewerId);
  };

  // 삭제된 번들이라 이동하지 않았으면 true(누른 칸이 사라지기 전에 부르는 쪽이 초점을 옮김)
  const open = (bunchId: string, bundleId: string, preview?: GridBundlePreview): boolean => {
    const key = viewerId === undefined ? null : keyOf(bunchId, bundleId, viewerId);
    const deleted = key !== null && checks.current.get(key)?.deleted === true;
    // 다음 누름은 새로 확인(받아 둔 상세가 있으면 바로 끝남)
    if (key !== null) checks.current.delete(key);
    if (deleted) {
      toast(BUNCH_HOME_MESSAGES.bundleDeleted);
      onDeleted();
      return true;
    }
    const href = BUNCH_HOME_PATHS.bundle(bunchId, bundleId);
    const now = Date.now();
    if (lastPush.current?.href === href && now - lastPush.current.at < REPEAT_PUSH_MS) return false;
    lastPush.current = { href, at: now };
    // 상세가 다 오기 전에 이동하면 칸 데이터(표지·제목)와 번치 정보로 먼저 그림
    if (preview) rememberPreview?.(bunchId, preview);
    router.push(href);
    return false;
  };

  return { open, warm };
}
