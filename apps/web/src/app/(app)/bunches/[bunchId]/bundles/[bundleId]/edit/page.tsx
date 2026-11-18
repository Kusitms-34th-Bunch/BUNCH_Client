import type { Metadata } from 'next';
import { FEED_PATHS } from '@/features/feed/constants/paths';
import { BundleEditRoute } from './BundleEditRoute';

// 메인 관리자만 쓰는 화면이라 검색에서 제외
export const metadata: Metadata = { title: '번들 수정', robots: { index: false } };

export default function BundleEditPage() {
  return (
    <div
      data-ssgoi-transition={FEED_PATHS.transitionIds.bundleEdit}
      className="bg-surface-primary flex h-full min-h-0 flex-1 flex-col"
    >
      <BundleEditRoute />
    </div>
  );
}
