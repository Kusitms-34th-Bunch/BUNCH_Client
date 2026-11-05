import type { Metadata } from 'next';
import { NotificationSettingsScreen } from '@/features/my/components';
import { MY_PATHS } from '@/features/my/constants/paths';
import { notificationSettingsFixture } from '@/features/my/fixtures/notificationSettings.fixture';

// 내 계정 화면이라 검색에서 제외
export const metadata: Metadata = { title: '알림 설정', robots: { index: false } };

export default function MyNotificationSettingsPage() {
  return (
    <div
      data-ssgoi-transition={MY_PATHS.notifications}
      className="bg-surface-primary flex h-full min-h-0 flex-1 flex-col"
    >
      {/* 기기 알림 권한 조회는 앱 연동(bridge) 전이라 켜짐으로 둠 */}
      <NotificationSettingsScreen
        settings={notificationSettingsFixture}
        devicePermission="granted"
      />
    </div>
  );
}
