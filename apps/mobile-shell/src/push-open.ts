import * as Notifications from 'expo-notifications';
import { toPushOpen } from './push-open-core';
import { pushOpenStore } from './push-open-store';

/**
 * 푸시를 눌러 앱을 열면(꺼져 있던 앱은 마지막 응답, 켜져 있던 앱은 리스너) 서버 payload를 보관하고 onOpened로 알림
 * 처리한 마지막 응답은 지움(다음 실행 때 같은 푸시로 다시 이동하지 않게). 「열기」가 아닌 동작(지우기 등)은 무시
 */
export function listenPushOpens(onOpened: () => void) {
  const handle = (response: Notifications.NotificationResponse | null) => {
    if (!response || response.actionIdentifier !== Notifications.DEFAULT_ACTION_IDENTIFIER) return;
    const { request } = response.notification;
    Notifications.clearLastNotificationResponse();
    const open = toPushOpen(request);
    if (open && pushOpenStore.set(request.identifier, open)) onOpened();
  };
  handle(Notifications.getLastNotificationResponse());
  const subscription = Notifications.addNotificationResponseReceivedListener(handle);
  return () => subscription.remove();
}
