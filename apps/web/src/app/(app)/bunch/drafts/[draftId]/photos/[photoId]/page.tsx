import type { Metadata } from 'next';
import { BundleDraftPhotoCaption } from '@/features/bundle/components';
import { BUNDLE_PATHS } from '@/features/bundle/constants/paths';
import { parsePhotoId } from '@/features/bundle/lib/draftId';

// 번치 멤버가 함께 쓰는 작성 중인 번들의 사진 상세라 검색에서 제외
export const metadata: Metadata = { title: '번들 사진', robots: { index: false } };

type BundleDraftPhotoPageProps = {
  params: Promise<{ photoId: string }>;
};

export default async function BundleDraftPhotoPage({ params }: BundleDraftPhotoPageProps) {
  const { photoId } = await params;

  return (
    <div
      data-ssgoi-transition={BUNDLE_PATHS.transitionIds.photo}
      className="bg-surface-primary flex h-full min-h-0 flex-1 flex-col"
    >
      <BundleDraftPhotoCaption photoId={parsePhotoId(photoId)} />
    </div>
  );
}
