import type { Metadata } from 'next';
import { FEED_PATHS } from '@/features/feed/constants/paths';
import { BundleVisibilityRoute } from './BundleVisibilityRoute';

// 메인 관리자만 쓰는 화면이라 검색에서 제외
export const metadata: Metadata = { title: '공개 범위', robots: { index: false } };

export default async function BundleVisibilityPage({
  params,
}: {
  params: Promise<{ bunchId: string; bundleId: string }>;
}) {
  const { bunchId, bundleId } = await params;
  return (
    <div
      data-ssgoi-transition={FEED_PATHS.transitionIds.bundleVisibility}
      className="bg-surface-primary flex h-full min-h-0 flex-1 flex-col"
    >
      <BundleVisibilityRoute bunchId={bunchId} bundleId={bundleId} />
    </div>
  );
}
