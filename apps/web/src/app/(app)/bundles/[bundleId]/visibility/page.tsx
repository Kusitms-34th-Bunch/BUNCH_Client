import type { Metadata } from 'next';
import { FEED_PATHS } from '@/features/feed/constants/paths';
import { BundleVisibilityRoute } from './BundleVisibilityRoute';

// 번들 API 연결 전 fixture 화면이라 검색에서 제외
export const metadata: Metadata = { title: '공개 범위', robots: { index: false } };

export default async function BundleVisibilityPage({
  params,
}: {
  params: Promise<{ bundleId: string }>;
}) {
  const { bundleId } = await params;
  return (
    <div
      data-ssgoi-transition={FEED_PATHS.transitionIds.bundleVisibility}
      className="bg-surface-primary flex h-full min-h-0 flex-1 flex-col"
    >
      <BundleVisibilityRoute bundleId={bundleId} />
    </div>
  );
}
