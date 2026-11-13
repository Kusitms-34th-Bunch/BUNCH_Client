import { useEffect, useState } from 'react';
import { toDomainId } from '@/shared/api/ids';

type MeQuery = {
  refetch: () => unknown;
  isFetching: boolean;
  dataUpdatedAt: number;
  errorUpdatedAt: number;
};
type HomeQuery = {
  data?: { currentBunchId?: number | null | undefined } | undefined;
  dataUpdatedAt: number;
};

/**
 * 서버가 본 명의(home 응답의 `currentBunchId`)가 캐시의 기본 번치와 다른지(다른 기기에서 전환 등)
 * 다르면 기본 번치(`members/me`)를 다시 받고, 그동안 팔로우가 이전 명의로 나가지 않게 막는 데 씀
 */
export function useViewerStale(viewerId: string | null | undefined, home: HomeQuery, me: MeQuery) {
  const serverViewerId = home.data?.currentBunchId;
  const stale =
    viewerId !== undefined &&
    serverViewerId !== null &&
    serverViewerId !== undefined &&
    toDomainId(serverViewerId) !== viewerId;
  const { refetch } = me;
  // home을 새로 받을 때마다 다시 확인(다시 시도로 home이 내 정보보다 늦게 와도 확인이 끝나게)
  useEffect(() => {
    if (stale) void refetch();
  }, [stale, refetch, home.dataUpdatedAt]);
  // 이 home보다 뒤에 다시 받은 내 정보(성공·실패)로도 어긋나면 다시 시도 화면
  const settled =
    stale && !me.isFetching && Math.max(me.dataUpdatedAt, me.errorUpdatedAt) > home.dataUpdatedAt;
  // 한 번 확정되면 명의가 맞을 때까지 유지(다시 시도로 다시 받는 동안 목록과 오가며 초점·탭 상태를 잃지 않게)
  const [held, setHeld] = useState(false);
  // 렌더 중 상태 맞추기(effect 안 setState 대신): 어긋남이 확정되면 켜고 명의가 맞으면 끔
  const nextHeld = stale && (held || settled);
  if (held !== nextHeld) setHeld(nextHeld);
  return { stale, mismatch: stale && (held || settled) };
}
