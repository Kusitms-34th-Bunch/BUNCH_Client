import type { Metadata } from 'next';
import { BundleDraftPick } from '@/features/bundle/components';
import { BUNDLE_PATHS } from '@/features/bundle/constants/paths';

// 번치 멤버가 함께 쓰는 작성 중인 번들의 대표 사진 투표라 검색에서 제외
export const metadata: Metadata = { title: '대표 사진 픽하기', robots: { index: false } };

export default function BundleDraftPickPage() {
  return (
    <div
      data-ssgoi-transition={BUNDLE_PATHS.transitionIds.pick}
      className="bg-surface-primary flex h-full min-h-0 flex-1 flex-col"
    >
      <BundleDraftPick />
    </div>
  );
}
