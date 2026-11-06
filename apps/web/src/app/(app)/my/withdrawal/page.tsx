import type { Metadata } from 'next';
import { WithdrawalScreen } from '@/features/my/components';
import { MY_PATHS } from '@/features/my/constants/paths';

// 내 계정 화면이라 검색에서 제외
export const metadata: Metadata = { title: '회원 탈퇴', robots: { index: false } };

export default function MyWithdrawalPage() {
  return (
    <div
      data-ssgoi-transition={MY_PATHS.withdrawal}
      className="bg-surface-primary flex h-full min-h-0 flex-1 flex-col"
    >
      <WithdrawalScreen />
    </div>
  );
}
