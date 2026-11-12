import type { Metadata } from 'next';
import { OtherBunch } from '@/features/bunch-home/components';
import { BUNCH_HOME_PATHS } from '@/features/bunch-home/constants/paths';

// 지금 번치 명의로 보는 화면이라 검색에서 제외(공개 번치 색인은 비로그인 열람이 생기면 정함)
export const metadata: Metadata = { title: '번치', robots: { index: false } };

export default async function OtherBunchPage({ params }: { params: Promise<{ bunchId: string }> }) {
  const { bunchId } = await params;
  return (
    <div
      data-ssgoi-transition={BUNCH_HOME_PATHS.transitionIds.otherBunch}
      className="bg-surface-primary flex h-full min-h-0 flex-1 flex-col"
    >
      {/* 다른 번치로 바로 이동해도 처음 상태(이동·전환 한 번만)에서 시작 */}
      <OtherBunch key={bunchId} bunchId={bunchId} />
    </div>
  );
}
