'use client';

import { pushOpenSchema } from '@app/bridge';
import { toast } from '@app/design-system';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useEffect, useRef } from 'react';
import { usePreservedCallback } from 'react-simplikit';
import { toDomainId } from '@/shared/api/ids';
import { appBridge, hasNativeMethod, nativeShellTab, openTabPath } from '@/shared/bridge/client';
import { toastAfterNavigation } from '@/shared/lib/toastAfterNavigation';
import { myProfileQueryOptions } from '@/shared/query/myProfile';
import { BUNCH_HOME_MESSAGES } from '../../constants/messages';
import { notificationPath } from '../../model/notifications';
import { useSwitchBunchMutation } from '../../queries/bunchHome';
import { useOpenPushNotificationMutation } from '../../queries/notifications';

/**
 * iOS 쉘에서 푸시를 눌러 앱을 열면 알림 목록과 같은 화면으로 이동
 * 수신함이 있는 알림(알림 ID 있음)이 다른 내 번치 것이면 그 번치로 전환한 뒤 이동하고 수신함 번치(`target.bunchId`)로 읽음 처리
 * 로그인 정보를 받은 뒤 화면에 보이는 탭 WebView만 가져감(곧 버려질 첫 화면은 제외, 쉘이 탭 ID로 한 번 더 거름)
 */
export function PushOpenNavigator() {
  const router = useRouter();
  const { data: me } = useQuery(myProfileQueryOptions());
  const switchBunch = useSwitchBunchMutation();
  const openNotification = useOpenPushNotificationMutation();
  const taking = useRef(false);
  // 처리 중에 새 푸시 알림이 오면 끝난 뒤 한 번 더 가져감
  const again = useRef(false);
  const signedIn = me !== undefined;

  const take = usePreservedCallback(async () => {
    if (!signedIn || document.visibilityState !== 'visible') return;
    // 첫 화면 WebView는 곧 탭 화면으로 넘어가며 버려져 가져가면 이동이 사라짐
    if (!hasNativeMethod('takeOpenedPush') || nativeShellTab() === null) return;
    if (taking.current) {
      again.current = true;
      return;
    }
    taking.current = true;
    try {
      const parsed = pushOpenSchema.safeParse(
        await appBridge.takeOpenedPush(nativeShellTab()).catch(() => null),
      );
      if (!parsed.success) return;
      const { target, notificationId } = parsed.data;
      const inbox = toDomainId(target.bunchId);
      // 지금 번치 기준 화면(멤버·권한·작성 중 등)이 다른 번치로 열리지 않게 수신함 번치로 먼저 전환
      // 수신함이 없는 푸시(내보내짐·번치 삭제)는 그 번치에 들어갈 수 없어 전환하지 않음
      if (notificationId !== null && me?.bunch && me.bunch.id !== inbox) {
        try {
          const switched = await switchBunch.mutateAsync(inbox);
          toastAfterNavigation(BUNCH_HOME_MESSAGES.switched(switched.name));
        } catch {
          // 이동하지 않아 화면 이동 뒤 토스트는 뜨지 않으므로 바로
          toast(BUNCH_HOME_MESSAGES.switchFailed);
          return;
        }
      }
      // 전환에 실패하면(다른 계정의 지난 푸시 등) 읽음 처리도 하지 않음
      if (notificationId !== null)
        openNotification.mutate({ bunchId: inbox, notificationId: toDomainId(notificationId) });
      openTabPath(notificationPath(target, { fromPush: true }), (href) => router.push(href));
    } finally {
      taking.current = false;
      if (again.current) {
        again.current = false;
        void take();
      }
    }
  });

  useEffect(() => {
    if (!signedIn) return;
    void take();
    const unsubscribe = appBridge.addEventListener('pushOpened', () => void take());
    const onVisible = () => void take();
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      unsubscribe();
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [signedIn, take]);

  return null;
}
