import type { Metadata } from 'next';
import { BunchNotifications } from '@/features/bunch-home/components';
import { BUNCH_HOME_PATHS } from '@/features/bunch-home/constants/paths';

// 내 번치의 알림이라 검색에서 제외
export const metadata: Metadata = { title: '알림', robots: { index: false } };

export default function BunchNotificationsPage() {
  return (
    <div
      data-ssgoi-transition={BUNCH_HOME_PATHS.notifications}
      className="bg-surface-secondary flex h-full min-h-0 flex-1 flex-col"
    >
      <BunchNotifications />
    </div>
  );
}
