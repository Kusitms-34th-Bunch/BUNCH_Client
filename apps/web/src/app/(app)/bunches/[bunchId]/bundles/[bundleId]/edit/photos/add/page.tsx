import type { Metadata } from 'next';
import { FEED_PATHS } from '@/features/feed/constants/paths';
import { BundleEditPhotoAddRoute } from './BundleEditPhotoAddRoute';

// 메인 관리자만 쓰는 화면이라 검색에서 제외
export const metadata: Metadata = { title: '사진 추가', robots: { index: false } };

export default function BundleEditPhotoAddPage() {
  return (
    <div
      data-ssgoi-transition={FEED_PATHS.transitionIds.bundleEditPhotoAdd}
      className="bg-surface-primary flex h-full min-h-0 flex-1 flex-col"
    >
      <BundleEditPhotoAddRoute />
    </div>
  );
}
