import type { Metadata } from 'next';
import { MainTabPage } from '@/features/main-navigation/components';
import { BunchHomeRoute } from './BunchHomeRoute';

// 번치 멤버의 개인 화면이라 검색에서 제외
export const metadata: Metadata = { title: '번치', robots: { index: false } };

export default async function BunchPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string | string[] }>;
}) {
  // 알림에서 「작성 중인 번들」로 오면(?tab=drafts) 그 탭, 그 밖의 값은 완성된 번들 탭
  const { tab } = await searchParams;
  return (
    // 탭 크로스페이드와 번치 추가(번치 시작 선택) 디졸브의 전환 대상(AppTransitions)
    <MainTabPage tab="bunch">
      <BunchHomeRoute initialTab={tab === 'drafts' ? 'draft' : 'completed'} />
    </MainTabPage>
  );
}
