'use client';

import { toast } from '@app/design-system';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { toDomainId } from '@/shared/api/ids';
import { useBackOr } from '@/shared/hooks/useBackOr';
import { loadFailed } from '@/shared/query/loadFailed';
import { myProfileQueryOptions } from '@/shared/query/myProfile';
import { BUNCH_HOME_MESSAGES } from '../../constants/messages';
import { BUNCH_HOME_PATHS } from '../../constants/paths';
import { itemsOfPages } from '../../lib/pages';
import { notificationPath, toBunchNotifications } from '../../model/notifications';
import {
  bunchNotificationsQueryOptions,
  useOpenNotificationMutation,
  useReadAllNotificationsMutation,
} from '../../queries/notifications';
import { AccessNoticeDialog } from '../home/AccessNoticeDialog';
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
  const list = useInfiniteQuery(bunchNotificationsQueryOptions(bunch?.id));
  const open = useOpenNotificationMutation(bunch?.id);
  const readAll = useReadAllNotificationsMutation(bunch?.id);
  // 같은 알림을 연달아 눌러도 한 번만 열기(이동은 다음 화면이 뜰 때까지 이어짐)
  const opening = useRef(false);
  // 접근 불가 알림(`ACCESS_NOTICE`)은 이동할 화면 없이 이 화면에서 안내 창을 띄움
  const [noticeId, setNoticeId] = useState<string>();
  const closeNotice = () => {
    setNoticeId(undefined);
    opening.current = false;
  };
  // 번치가 없는 회원은 알림 목록이 없어 번치 탭(번치 없음 안내)으로
  const noBunch = me.data !== undefined && !me.data.bunch;
  useEffect(() => {
    if (noBunch) router.replace(BUNCH_HOME_PATHS.home);
  }, [noBunch, router]);
  // 직접 진입이라 돌아갈 기록이 없으면 번치 홈으로 이동
  const back = () => backOr(BUNCH_HOME_PATHS.home);

  if (loadFailed(me) || loadFailed(list)) {
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
      <BunchNotificationsScreen
        bunchName={bunch?.name}
        notifications={
          list.data
            ? toBunchNotifications({ items: itemsOfPages(list.data.pages, (item) => item.id) })
            : undefined
        }
        // 읽지 않은 수는 가장 최근에 받은 쪽의 값(쪽마다 같은 서버 수)
        hasUnread={(list.data?.pages.at(-1)?.unreadCount ?? 0) > 0}
        more={list}
        onBack={back}
        onReadAll={() => readAll.mutateAsync()}
        // 읽음 처리(열기 요청)를 기다리지 않고 목록의 이동 대상으로 바로 감. 갈 수 없게 된 대상은 도착 화면이 안내
        onOpen={(notification) => {
          const item = list.data?.pages
            .flatMap((page) => page.items)
            .find((candidate) => toDomainId(candidate.id) === notification.id);
          if (!item || opening.current) return;
          opening.current = true;
          open.mutate(notification.id);
          if (item.target.kind === 'ACCESS_NOTICE' && item.target.noticeId) {
            setNoticeId(toDomainId(item.target.noticeId));
            return;
          }
          router.push(notificationPath(item.target));
        }}
      />
      {noticeId ? (
        <AccessNoticeDialog
          noticeId={noticeId}
          onClosed={closeNotice}
          onFailed={() => {
            closeNotice();
            toast(BUNCH_HOME_MESSAGES.notificationUnavailable);
          }}
        />
      ) : null}
    </>
  );
}
