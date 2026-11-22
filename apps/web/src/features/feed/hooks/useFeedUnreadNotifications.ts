import { useQuery } from '@tanstack/react-query';
import { toDomainId } from '@/shared/api/ids';
import { myBunchesQueryOptions } from '@/shared/query/myBunches';
import type { FeedViewer } from '../lib/types';

// 번치 홈 헤더(`/home`을 20초마다 다시 받음)와 점이 어긋나지 않게 같은 주기로 다시 받음(이 observer에만 적용)
const UNREAD_REFRESH = { staleTime: 0, refetchInterval: 20_000 } as const;

/**
 * 지금 번치에 읽지 않은 알림이 있는지(피드 헤더 알림 아이콘의 점)
 * 알림 수만 주는 API가 없어 번치 전환 목록(`members/me/bunches`)의 번치별 unreadCount를 씀. 알림을 읽으면 이 목록도 다시 받음
 * 받기 전·실패·번치 없음은 점 없음
 */
export function useFeedUnreadNotifications(viewer: FeedViewer | undefined) {
  const bunchId = viewer?.bunchId;
  const { data } = useQuery({
    ...myBunchesQueryOptions(),
    ...UNREAD_REFRESH,
    enabled: bunchId !== undefined,
    select: (bunches) =>
      bunches.activeBunches.some(
        ({ bunch, unreadCount }) => toDomainId(bunch.id) === bunchId && unreadCount > 0,
      ),
  });
  return data ?? false;
}
