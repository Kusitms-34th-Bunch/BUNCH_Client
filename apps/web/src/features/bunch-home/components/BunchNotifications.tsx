'use client';

import { useRouter } from 'next/navigation';
import { BUNCH_HOME_PATHS } from '../constants/paths';
import { bunchDetailsFixture, initialBunchDetailFixture } from '../fixtures/bunchHome.fixture';
import { useBunchNotifications } from '../hooks/useBunchNotifications';
import { useCurrentBunchId } from '../hooks/useCurrentBunchId';
import { BunchNotificationsScreen } from './BunchNotificationsScreen';

/**
 * `/bunch/notifications` 지금 번치의 알림 목록: 누르면 읽음, 「모두 읽음」. 읽음 서버 처리는 API 연결 때
 * 알림 종류별 이동(번들 후보 → 번들 만들기 등)은 이동할 화면과 알림 계약이 정해지면 연결
 */
export function BunchNotifications() {
  const router = useRouter();
  const [currentId] = useCurrentBunchId();
  // 첫 hydration은 저장된 번치를 몰라 목록을 그리지 않음
  const bunch =
    currentId === null ? undefined : (bunchDetailsFixture[currentId] ?? initialBunchDetailFixture);
  const { notifications, readOne, readAll } = useBunchNotifications(bunch?.id);

  return (
    <BunchNotificationsScreen
      bunchName={bunch?.name}
      notifications={notifications}
      // 직접 진입이라 돌아갈 기록이 없으면 번치 홈으로 이동
      onBack={() =>
        window.history.length > 1 ? router.back() : router.replace(BUNCH_HOME_PATHS.home)
      }
      onReadAll={readAll}
      onOpen={(notification) => readOne(notification.id)}
    />
  );
}
