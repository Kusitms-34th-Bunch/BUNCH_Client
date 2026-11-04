import type { Metadata } from 'next';
import { ProfileEditScreen } from '@/features/my/components';
import { myProfileFixture } from '@/features/my/fixtures/myProfile.fixture';

// 내 계정 화면이라 검색에서 제외
export const metadata: Metadata = { title: '개인 프로필 수정', robots: { index: false } };

export default function MyProfileEditPage() {
  return <ProfileEditScreen profile={myProfileFixture} />;
}
