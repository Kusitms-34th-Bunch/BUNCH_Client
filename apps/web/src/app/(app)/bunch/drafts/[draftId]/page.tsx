import type { Metadata } from 'next';
import { BundleDraft } from '@/features/bundle/components';
import { BUNDLE_PATHS } from '@/features/bundle/constants/paths';

// 번치 멤버가 함께 쓰는 작성 중인 번들이라 검색에서 제외
export const metadata: Metadata = { title: '번들 작성', robots: { index: false } };

export default function BundleDraftPage() {
  return (
    <div
      data-ssgoi-transition={BUNDLE_PATHS.transitionIds.draft}
      className="bg-surface-primary flex h-full min-h-0 flex-1 flex-col"
    >
      <BundleDraft />
    </div>
  );
}
