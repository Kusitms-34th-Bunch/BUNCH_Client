import type { Metadata } from 'next';
import { BundleDraftPhotoAdd } from '@/features/bundle/components';
import { BUNDLE_PATHS } from '@/features/bundle/constants/paths';

// 번치 멤버가 함께 쓰는 작성 중인 번들의 사진 추가 화면이라 검색에서 제외
export const metadata: Metadata = { title: '번들 사진 추가', robots: { index: false } };

export default function BundleDraftPhotoAddPage() {
  return (
    <div
      data-ssgoi-transition={BUNDLE_PATHS.transitionIds.photoAdd}
      className="bg-surface-primary flex h-full min-h-0 flex-1 flex-col"
    >
      <BundleDraftPhotoAdd />
    </div>
  );
}
