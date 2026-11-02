import type { Metadata } from 'next';
import { MyBunchFollows } from '@/features/bunch-home/components';
import { BUNCH_HOME_PATHS } from '@/features/bunch-home/constants/paths';

// 내 번치의 관계 목록이라 검색에서 제외
export const metadata: Metadata = { title: '팔로워·팔로잉', robots: { index: false } };

export default async function BunchFollowsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string | string[] }>;
}) {
  // 프로필의 「팔로잉」 수에서 오면 팔로잉 탭, 그 밖의 값은 팔로워 탭
  const { tab } = await searchParams;
  return (
    <div
      data-ssgoi-transition={BUNCH_HOME_PATHS.follows}
      className="bg-surface-primary flex h-full min-h-0 flex-1 flex-col"
    >
      <MyBunchFollows initialTab={tab === 'following' ? 'following' : 'followers'} />
    </div>
  );
}
