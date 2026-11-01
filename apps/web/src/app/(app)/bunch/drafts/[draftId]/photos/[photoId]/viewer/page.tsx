import type { Metadata } from 'next';
import { BundleDraftPhotoViewer } from '@/features/bundle/components';
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

  return <BundleDraftPhotoViewer photoId={parsePhotoId(photoId)} />;
}
