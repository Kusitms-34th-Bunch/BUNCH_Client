import type { Metadata } from 'next';
import { BunchDelete } from '@/features/bunch-home/components';
import { BUNCH_HOME_PATHS } from '@/features/bunch-home/constants/paths';

// 번치 관리 화면이라 검색에서 제외. 대상 번치(`?bunch=`)가 지금 번치가 아니면 화면이 안내로, 메인 관리자가 아니면 메뉴로 돌려보냄
export const metadata: Metadata = { title: '번치 삭제', robots: { index: false } };

export default async function BunchDeleteConfirmPage({
  searchParams,
}: {
  searchParams: Promise<{ bunch?: string | string[] }>;
}) {
  const { bunch } = await searchParams;
  return (
    <div
      data-ssgoi-transition={BUNCH_HOME_PATHS.deleteConfirm}
      className="bg-surface-primary flex h-full min-h-0 flex-1 flex-col"
    >
      <BunchDelete step="confirm" targetId={typeof bunch === 'string' ? bunch : undefined} />
    </div>
  );
}
