import type { Metadata } from 'next';
import { MainTabPage } from '@/features/main-navigation/components';
import { MyScreen } from '@/features/my/components';
import { myProfileFixture } from '@/features/my/fixtures/myProfile.fixture';

// 내 계정 화면이라 검색에서 제외
export const metadata: Metadata = { title: '마이페이지', robots: { index: false } };

export default function MyPage() {
  return (
    <MainTabPage tab="my">
      <MyScreen profile={myProfileFixture} />
    </MainTabPage>
  );
}
