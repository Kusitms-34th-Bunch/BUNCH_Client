import type { Metadata } from 'next';
import { ProfileEditRoute } from '@/features/my/components';
import { MY_PATHS } from '@/features/my/constants/paths';

// 내 계정 화면이라 검색에서 제외
export const metadata: Metadata = { title: '개인 프로필 수정', robots: { index: false } };

export default function MyProfileEditPage() {
  return (
    <div
      data-ssgoi-transition={MY_PATHS.profile}
      className="bg-surface-primary flex h-full min-h-0 flex-1 flex-col"
    >
      <ProfileEditRoute />
    </div>
  );
}
