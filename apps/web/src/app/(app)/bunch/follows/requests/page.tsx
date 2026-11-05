import type { Metadata } from 'next';
import { FollowRequests } from '@/features/bunch-home/components';
import { BUNCH_HOME_PATHS } from '@/features/bunch-home/constants/paths';

// 내 번치에 온 요청이라 검색에서 제외
export const metadata: Metadata = { title: '팔로우 요청', robots: { index: false } };

export default function FollowRequestsPage() {
  return (
    <div
      data-ssgoi-transition={BUNCH_HOME_PATHS.followRequests}
      className="bg-surface-primary flex h-full min-h-0 flex-1 flex-col"
    >
      <FollowRequests />
    </div>
  );
}
