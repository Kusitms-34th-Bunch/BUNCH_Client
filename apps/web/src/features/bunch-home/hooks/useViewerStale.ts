import { useEffect } from 'react';
import { toDomainId } from '@/shared/api/ids';

/**
 * 서버가 본 명의(home 응답의 `currentBunchId`)가 캐시의 기본 번치와 다른지(다른 기기에서 전환 등)
 * 다르면 기본 번치(`members/me`)를 다시 받음. 그동안 팔로우가 이전 명의로 나가지 않게 막는 데 씀
 */
export function useViewerStale(
  viewerId: string | null | undefined,
  serverViewerId: number | null | undefined,
  refetchMe: () => unknown,
) {
  const stale =
    viewerId !== undefined &&
    serverViewerId !== null &&
    serverViewerId !== undefined &&
    toDomainId(serverViewerId) !== viewerId;
  useEffect(() => {
    if (stale) void refetchMe();
  }, [stale, refetchMe]);
  return stale;
}
