import type { Metadata } from 'next';
import { BunchHome } from '@/features/bunch-home/components';
import { BUNCH_HOME_PATHS } from '@/features/bunch-home/constants/paths';

// 번치 멤버의 개인 화면이라 검색에서 제외
export const metadata: Metadata = { title: '번치', robots: { index: false } };

export default function BunchPage() {
  return (
    // 번치 추가(번치 시작 선택)로 갈 때 디졸브 전환 대상(AppTransitions)
    <div
      data-ssgoi-transition={BUNCH_HOME_PATHS.home}
      className="flex h-full min-h-0 flex-1 flex-col"
    >
      <BunchHome />
    </div>
  );
}
