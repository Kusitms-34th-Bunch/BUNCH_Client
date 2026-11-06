import type { Metadata } from 'next';
import { WithdrawalScreen } from '@/features/my/components';
import { MY_PATHS } from '@/features/my/constants/paths';
import { hasOwnedBunchFixture } from '@/features/my/fixtures/withdrawal.fixture';

// 내 계정 화면이라 검색에서 제외
export const metadata: Metadata = { title: '회원 탈퇴', robots: { index: false } };

export default function MyWithdrawalPage() {
  return (
    <div
      data-ssgoi-transition={MY_PATHS.withdrawal}
      className="bg-surface-primary flex h-full min-h-0 flex-1 flex-col"
    >
      {/* 메인 관리자 확인 API 연결 전이라 fixture */}
      <WithdrawalScreen hasOwnedBunch={hasOwnedBunchFixture} />
    </div>
  );
}
