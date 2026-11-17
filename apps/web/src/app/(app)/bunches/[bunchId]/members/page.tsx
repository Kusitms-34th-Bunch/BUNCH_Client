import type { Metadata } from 'next';
import { OtherBunchMembers } from '@/features/bunch-home/components';
import { BUNCH_HOME_PATHS } from '@/features/bunch-home/constants/paths';

// 로그인한 사람만 보는 다른 번치 명단이라 검색에서 제외
export const metadata: Metadata = { title: '번치 멤버', robots: { index: false } };

export default async function OtherBunchMembersPage({
  params,
}: {
  params: Promise<{ bunchId: string }>;
}) {
  const { bunchId } = await params;
  return (
    <div
      data-ssgoi-transition={BUNCH_HOME_PATHS.transitionIds.otherBunchMembers}
      className="bg-surface-primary flex h-full min-h-0 flex-1 flex-col"
    >
      <OtherBunchMembers bunchId={bunchId} />
    </div>
  );
}
