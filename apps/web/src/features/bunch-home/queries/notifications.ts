import {
  type InfiniteData,
  infiniteQueryOptions,
  type QueryClient,
  skipToken,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import { sharedKeys } from '@/shared/query/keys';
import type { NotificationPage } from '../model/notifications';
import {
  getBunchNotifications,
  openBunchNotification,
  readAllBunchNotifications,
} from '../api/notifications';
import { BUNCH_HOME_MESSAGES } from '../constants/messages';
import { FIRST_PAGE, nextPageOf } from '../lib/pages';
import { bunchHomeKeys } from './keys';

/** 내 번치의 알림(쪽 단위, 목록 끝에서 이어서 받음). 번치를 모르면 요청하지 않음 */
export const bunchNotificationsQueryOptions = (bunchId: string | undefined) =>
  infiniteQueryOptions({
    queryKey: bunchHomeKeys.notificationPages(bunchId),
    initialPageParam: FIRST_PAGE,
    queryFn: bunchId
      ? ({ pageParam, signal }) => getBunchNotifications(bunchId, pageParam, signal)
      : skipToken,
    getNextPageParam: nextPageOf,
    // 번치 홈이 미리 받아 둬도 들어올 때마다 다시 받음(새 알림이 늦게 보이지 않게, 받아 둔 목록은 바로 보임)
    refetchOnMount: 'always',
  });

// 읽음이 바뀌면 목록과 읽지 않은 수(번치 홈 헤더·전환 목록 「알림 N개」)를 다시 받음
const refreshUnread = (queryClient: QueryClient, bunchId: string) =>
  Promise.all([
    queryClient.invalidateQueries({ queryKey: bunchHomeKeys.notifications(bunchId) }),
    queryClient.invalidateQueries({ queryKey: sharedKeys.bunchHome(bunchId) }),
    queryClient.invalidateQueries({ queryKey: sharedKeys.myBunches() }),
  ]);

/**
 * 알림 열기의 읽음 처리. 화면은 응답을 기다리지 않고 이미 이동하므로 실패해도 알리지 않음
 * 성공·실패 모두 목록·읽지 않은 수를 다시 받아 서버 값으로 맞춤(캐시를 미리 바꾸지 않음)
 */
export const useOpenNotificationMutation = (bunchId: string | undefined) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (notificationId: string) => {
      if (!bunchId) throw new Error('알림을 열 번치가 없습니다.');
      return openBunchNotification(bunchId, notificationId);
    },
    // 다시 받기를 기다리지 않음(onSettled를 기다린 뒤에야 성공 처리·화면 이동이 이어짐)
    onSettled: () => {
      if (bunchId) void refreshUnread(queryClient, bunchId);
    },
  });
};

/** 푸시로 연 알림의 읽음 처리: 번치가 알림마다 달라(수신함 `target.bunchId`) 변수로 받음. 실패해도 알리지 않음 */
export const useOpenPushNotificationMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ bunchId, notificationId }: { bunchId: string; notificationId: string }) =>
      openBunchNotification(bunchId, notificationId),
    onSettled: (_data, _error, { bunchId }) => void refreshUnread(queryClient, bunchId),
  });
};

/** 알림 모두 읽음. 실패하면 공통 토스트 */
export const useReadAllNotificationsMutation = (bunchId: string | undefined) => {
  const queryClient = useQueryClient();
  return useMutation({
    meta: { errorMessage: BUNCH_HOME_MESSAGES.readFailed },
    mutationFn: async () => {
      if (!bunchId) throw new Error('알림을 읽을 번치가 없습니다.');
      const { unreadCount } = await readAllBunchNotifications(bunchId);
      // 서버 처리가 끝났으면 결과 낭독 전에 받은 목록을 읽음으로 바꿔 둠(다시 받기가 실패해도 화면·낭독이 어긋나지 않게)
      const readAt = new Date().toISOString();
      queryClient.setQueryData<InfiniteData<NotificationPage, number>>(
        bunchHomeKeys.notificationPages(bunchId),
        (data) =>
          data && {
            ...data,
            pages: data.pages.map((page) => ({
              ...page,
              unreadCount,
              items: page.items.map((item) => (item.readAt ? item : { ...item, readAt })),
            })),
          },
      );
      void refreshUnread(queryClient, bunchId);
    },
  });
};
