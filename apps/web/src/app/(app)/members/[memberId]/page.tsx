import type { Metadata } from 'next';
import { FEED_PATHS } from '@/features/feed/constants/paths';
import { MemberProfileRoute } from './MemberProfileRoute';

// 다른 사용자의 프로필이라 검색에서 제외
export const metadata: Metadata = { title: '멤버 프로필', robots: { index: false } };

export default async function MemberProfilePage({
  params,
}: {
  params: Promise<{ memberId: string }>;
}) {
  const { memberId } = await params;
  return (
    <div
      data-ssgoi-transition={FEED_PATHS.transitionIds.member}
      className="bg-surface-primary flex h-full min-h-0 flex-1 flex-col"
    >
      <MemberProfileRoute memberId={memberId} />
    </div>
  );
}
