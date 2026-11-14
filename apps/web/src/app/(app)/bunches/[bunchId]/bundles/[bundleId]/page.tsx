import type { Metadata } from 'next';
import { FEED_PATHS } from '@/features/feed/constants/paths';
import { BundleDetailRoute } from './BundleDetailRoute';

// 지금 번치 명의로 보는 화면이라 검색에서 제외(다른 번치 프로필과 같음)
export const metadata: Metadata = { title: '번들', robots: { index: false } };

export default async function BundleDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ bunchId: string; bundleId: string }>;
  searchParams: Promise<{ focus?: string | string[] }>;
}) {
  const [{ bunchId, bundleId }, { focus }] = await Promise.all([params, searchParams]);
  return (
    <div
      data-ssgoi-transition={FEED_PATHS.transitionIds.bundle}
      className="bg-surface-primary flex h-full min-h-0 flex-1 flex-col"
    >
      {/* 알 수 없는 focus 값은 무시 */}
      <BundleDetailRoute
        bunchId={bunchId}
        bundleId={bundleId}
        focusComments={focus === 'comments'}
      />
    </div>
  );
}
