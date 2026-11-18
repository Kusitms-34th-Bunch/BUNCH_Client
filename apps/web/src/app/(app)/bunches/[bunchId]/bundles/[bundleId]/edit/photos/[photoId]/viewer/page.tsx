import type { Metadata } from 'next';
import { parsePhotoId } from '@/features/bundle/lib/draftId';
import { FEED_PATHS } from '@/features/feed/constants/paths';
import { BundleEditPhotoViewerRoute } from './BundleEditPhotoViewerRoute';

// 메인 관리자만 쓰는 화면이라 검색에서 제외
export const metadata: Metadata = { title: '사진 크게 보기', robots: { index: false } };

type BundleEditPhotoViewerPageProps = {
  params: Promise<{ photoId: string }>;
};

export default async function BundleEditPhotoViewerPage({
  params,
}: BundleEditPhotoViewerPageProps) {
  const { photoId } = await params;

  return (
    <div
      data-ssgoi-transition={FEED_PATHS.transitionIds.bundleEditPhotoViewer}
      className="flex h-full min-h-0 flex-1 flex-col"
    >
      <BundleEditPhotoViewerRoute photoId={parsePhotoId(photoId)} />
    </div>
  );
}
