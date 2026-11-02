import type { Metadata } from 'next';
import { OtherBunch } from '@/features/bunch-home/components';
import { BUNCH_HOME_PATHS } from '@/features/bunch-home/constants/paths';

// 번치 API 연결 전 fixture 화면이라 검색에서 제외(공개 번치 색인은 서버 데이터가 생기면 정함)
export const metadata: Metadata = { title: '번치', robots: { index: false } };

export default async function OtherBunchPage({ params }: { params: Promise<{ bunchId: string }> }) {
  const { bunchId } = await params;
  return (
    <div
      data-ssgoi-transition={BUNCH_HOME_PATHS.transitionIds.otherBunch}
      className="bg-surface-primary flex h-full min-h-0 flex-1 flex-col"
    >
      <OtherBunch bunchId={bunchId} />
    </div>
  );
}
