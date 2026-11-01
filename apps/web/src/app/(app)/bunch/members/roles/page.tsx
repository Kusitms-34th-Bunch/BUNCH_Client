import type { Metadata } from 'next';
import { BunchRoleGuide } from '@/features/bunch-home/components';
import { BUNCH_HOME_PATHS } from '@/features/bunch-home/constants/paths';

// 번치 관리 안내라 검색에서 제외. 모든 역할이 보는 안내 화면이라 접근 guard 없음
export const metadata: Metadata = { title: '역할별 권한', robots: { index: false } };

export default function BunchRoleGuidePage() {
  return (
    <div
      data-ssgoi-transition={BUNCH_HOME_PATHS.roles}
      className="bg-surface-primary flex h-full min-h-0 flex-1 flex-col"
    >
      <BunchRoleGuide />
    </div>
  );
}
