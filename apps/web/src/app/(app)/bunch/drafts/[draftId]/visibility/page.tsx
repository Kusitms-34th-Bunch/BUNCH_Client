import type { Metadata } from 'next';
import { BUNDLE_PATHS } from '@/features/bundle/constants/paths';
import { BunchVisibilityRoute } from './BunchVisibilityRoute';

// 번치 멤버가 함께 쓰는 작성 중인 번들의 공개 범위 화면이라 검색에서 제외
export const metadata: Metadata = { title: '공개 범위', robots: { index: false } };

export default function BundleDraftVisibilityPage() {
  return (
    <div
      data-ssgoi-transition={BUNDLE_PATHS.transitionIds.visibility}
      className="bg-surface-primary flex h-full min-h-0 flex-1 flex-col"
    >
      <BunchVisibilityRoute />
    </div>
  );
}
