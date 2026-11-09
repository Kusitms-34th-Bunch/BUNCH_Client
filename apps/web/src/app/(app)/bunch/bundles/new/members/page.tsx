import type { Metadata } from 'next';
import { BundleMemberSelect } from '@/features/bundle/components';
import { BUNDLE_SELECT_PATHS } from '@/features/bundle/constants/selectPaths';

// 번치 멤버 목록을 보여 주는 화면이라 검색에서 제외
export const metadata: Metadata = { title: '번들 만들기', robots: { index: false } };

export default function BundleMemberSelectPage() {
  return (
    <div
      data-ssgoi-transition={BUNDLE_SELECT_PATHS.members}
      className="bg-surface-primary flex h-full min-h-0 flex-1 flex-col"
    >
      <BundleMemberSelect />
    </div>
  );
}
