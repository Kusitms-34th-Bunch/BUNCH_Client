import type { Metadata } from 'next';
import { BunchBlockedList } from '@/features/bunch-home/components';
import { BUNCH_HOME_PATHS } from '@/features/bunch-home/constants/paths';

// 번치 관리 화면이라 검색에서 제외. 모든 역할이 들어와 접근 guard 없음, 해제는 관리자만(화면이 역할로 나눔, 서버 판단은 API 연결 때)
export const metadata: Metadata = { title: '차단 목록', robots: { index: false } };

export default function BunchBlockedListPage() {
  return (
    <div
      data-ssgoi-transition={BUNCH_HOME_PATHS.blocked}
      className="bg-surface-primary flex h-full min-h-0 flex-1 flex-col"
    >
      <BunchBlockedList />
    </div>
  );
}
