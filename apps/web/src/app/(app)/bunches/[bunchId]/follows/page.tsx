import type { Metadata } from 'next';
import { OtherBunchFollows } from '@/features/bunch-home/components';
import { BUNCH_HOME_PATHS } from '@/features/bunch-home/constants/paths';

// 번치 API 연결 전 fixture 화면이라 검색에서 제외
export const metadata: Metadata = { title: '팔로워·팔로잉', robots: { index: false } };

export default async function OtherBunchFollowsPage({
  params,
  searchParams,
}: {
  params: Promise<{ bunchId: string }>;
  searchParams: Promise<{ tab?: string | string[] }>;
}) {
  const [{ bunchId }, { tab }] = await Promise.all([params, searchParams]);
  return (
    <div
      data-ssgoi-transition={BUNCH_HOME_PATHS.transitionIds.otherBunchFollows}
      className="bg-surface-primary flex h-full min-h-0 flex-1 flex-col"
    >
      <OtherBunchFollows
        bunchId={bunchId}
        initialTab={tab === 'following' ? 'following' : 'followers'}
      />
    </div>
  );
}
