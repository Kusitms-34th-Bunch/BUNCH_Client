import type { Metadata } from 'next';
import { BunchLeave } from '@/features/bunch-home/components';
import { BUNCH_HOME_PATHS } from '@/features/bunch-home/constants/paths';

// 번치 관리 화면이라 검색에서 제외(메인 관리자 외 진입은 화면이 메뉴로 돌려보냄, 서버 판단은 API 연결 때)
export const metadata: Metadata = { title: '번치 나가기', robots: { index: false } };

export default function BunchLeavePage() {
  return (
    <div
      data-ssgoi-transition={BUNCH_HOME_PATHS.leave}
      className="bg-surface-primary flex h-full min-h-0 flex-1 flex-col"
    >
      <BunchLeave />
    </div>
  );
}
