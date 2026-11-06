import type { Metadata } from 'next';
import { AdminTransferScreen } from '@/features/my/components';
import { MY_PATHS } from '@/features/my/constants/paths';

// 내 계정 화면이라 검색에서 제외
export const metadata: Metadata = { title: '관리자 권한 넘기기', robots: { index: false } };

export default function MyWithdrawalTransferPage() {
  return (
    <div
      data-ssgoi-transition={MY_PATHS.withdrawalTransfer}
      className="bg-surface-primary flex h-full min-h-0 flex-1 flex-col"
    >
      <AdminTransferScreen />
    </div>
  );
}
