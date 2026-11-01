import type { Metadata } from 'next';
import { BunchHome } from '@/features/bunch-home/components';
import { MainTabPage } from '@/features/main-navigation/components';

// 번치 멤버의 개인 화면이라 검색에서 제외
export const metadata: Metadata = { title: '번치', robots: { index: false } };

export default function BunchPage() {
  return (
    // 탭 크로스페이드와 번치 추가(번치 시작 선택) 디졸브의 전환 대상(AppTransitions)
    <MainTabPage tab="bunch">
      <BunchHome />
    </MainTabPage>
  );
}
