import type { Metadata } from 'next';
import { BundleDraftPhotoViewer } from '@/features/bundle/components';
import { BUNDLE_PATHS } from '@/features/bundle/constants/paths';
import { parsePhotoId } from '@/features/bundle/lib/draftId';

// 번치 멤버가 함께 쓰는 작성 중인 번들의 사진이라 검색에서 제외
export const metadata: Metadata = { title: '사진 크게 보기', robots: { index: false } };

type BundleDraftPhotoViewerPageProps = {
  params: Promise<{ photoId: string }>;
};

export default async function BundleDraftPhotoViewerPage({
  params,
}: BundleDraftPhotoViewerPageProps) {
  const { photoId } = await params;

  return (
    // 작성 화면에서 사진을 눌러 들어오므로 작성 화면과 같은 슬라이드 전환 경계
    <div
      data-ssgoi-transition={BUNDLE_PATHS.transitionIds.viewer}
      className="flex h-full min-h-0 flex-1 flex-col"
    >
      <BundleDraftPhotoViewer photoId={parsePhotoId(photoId)} />
    </div>
  );
}
