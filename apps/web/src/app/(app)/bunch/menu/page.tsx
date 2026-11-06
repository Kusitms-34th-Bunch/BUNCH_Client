import type { Metadata } from 'next';
import { BunchMenu } from '@/features/bunch-home/components';
import { BUNCH_HOME_PATHS } from '@/features/bunch-home/constants/paths';

// 번치 관리 메뉴라 검색에서 제외(접근 guard는 로그인·번치 API 연결 때 추가)
export const metadata: Metadata = { title: '번치 더보기', robots: { index: false } };

export default function BunchMenuPage() {
  return (
    <div
      data-ssgoi-transition={BUNCH_HOME_PATHS.menu}
      className="bg-surface-primary flex h-full min-h-0 flex-1 flex-col"
    >
      <BunchMenu />
    </div>
  );
}
