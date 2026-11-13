'use client';

import { toast } from '@app/design-system';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useEffect, useRef } from 'react';
import { PageLoading } from '@/shared/components/loading/PageLoading';
import { useBackOr } from '@/shared/hooks/useBackOr';
import { myProfileQueryOptions } from '@/shared/query/myProfile';
import { BUNCH_HOME_MESSAGES } from '../../constants/messages';
import { BUNCH_HOME_PATHS } from '../../constants/paths';
import { notificationPath, toBunchNotifications } from '../../model/notifications';
import {
  bunchNotificationsQueryOptions,
  useOpenNotificationMutation,
  useReadAllNotificationsMutation,
} from '../../queries/notifications';
import { BunchHomeError } from '../home/BunchHomeError';
import { BunchNotificationsScreen } from './BunchNotificationsScreen';

/**
 * `/bunch/notifications` 지금 번치(`members/me` 기본 번치)의 알림 목록: 누르면 열기(읽음 + 종류별 화면 이동), 「모두 읽음」
 * 알림은 내 번치 안의 것이라 명의가 바뀌어도 그 번치의 읽음으로 처리됨(다른 번치 명의로 나가는 요청 없음)
 */
export function BunchNotifications() {
  const router = useRouter();
  const backOr = useBackOr();
  const me = useQuery(myProfileQueryOptions());
  const bunch = me.data?.bunch ?? undefined;
  const list = useQuery(bunchNotificationsQueryOptions(bunch?.id));
  const open = useOpenNotificationMutation(bunch?.id);
  const readAll = useReadAllNotificationsMutation(bunch?.id);
  // 같은 알림을 연달아 눌러도 한 번만 열기(isPending은 다음 렌더부터 반영)
  const opening = useRef(false);
  // 번치가 없는 회원은 알림 목록이 없어 번치 탭(번치 없음 안내)으로
  const noBunch = me.data !== undefined && !me.data.bunch;
  useEffect(() => {
    if (noBunch) router.replace(BUNCH_HOME_PATHS.home);
  }, [noBunch, router]);
  // 직접 진입이라 돌아갈 기록이 없으면 번치 홈으로 이동
  const back = () => backOr(BUNCH_HOME_PATHS.home);

  if ((me.isError && !me.data) || (list.isError && !list.data)) {
    return (
      <BunchHomeError
        onRetry={() => {
          void me.refetch();
          if (bunch) void list.refetch();
        }}
        onBack={back}
        title="알림"
      />
    );
  }

  return (
    <>
      {/* 여는 동안 덮개(다른 알림·버튼을 막음), 안내는 화면의 늘 있는 상태 영역에 실음 */}
      {open.isPending ? <PageLoading /> : null}
      <BunchNotificationsScreen
        bunchName={bunch?.name}
        notifications={list.data ? toBunchNotifications(list.data) : undefined}
        hasUnread={(list.data?.unreadCount ?? 0) > 0}
        notice={open.isPending ? BUNCH_HOME_MESSAGES.openingNotification : undefined}
        onBack={back}
        onReadAll={() => readAll.mutateAsync()}
        onOpen={(notification) => {
          if (opening.current) return;
          opening.current = true;
          open.mutate(notification.id, {
            onSuccess: (result) => {
              if (!result.available || !result.target) {
                opening.current = false;
                toast(BUNCH_HOME_MESSAGES.notificationUnavailable);
                return;
              }
              // 이동하는 동안(덮개가 내려간 뒤 새 화면이 뜨기 전) 다시 열지 않게 가드를 풀지 않음
              router.push(notificationPath(result.target));
            },
            onError: () => {
              opening.current = false;
            },
          });
        }}
      />
    </>
  );
}
