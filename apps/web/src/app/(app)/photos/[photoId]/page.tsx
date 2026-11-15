import type { Metadata } from 'next';
import { PhotoDetail } from '@/features/photo-box/components';
import { PHOTO_BOX_PATHS } from '@/features/photo-box/constants/paths';
import { parsePhotoId } from '@/features/photo-box/lib/photoDetail';

// 번치 멤버의 개인 사진 화면이라 검색에서 제외
export const metadata: Metadata = { title: '사진 상세', robots: { index: false } };

type PhotoDetailPageProps = {
  params: Promise<{ photoId: string }>;
};

export default async function PhotoDetailPage({ params }: PhotoDetailPageProps) {
  const { photoId } = await params;

  return (
    // 사진함 썸네일에서 hero로 들어오는 전환 경계. 사진 영역은 화면 끝까지(탭 바가 숨으며 아래 여백이 바뀌어도 사진이 밀리지 않게)
    <div
      data-ssgoi-transition={PHOTO_BOX_PATHS.transitionIds.detail}
      data-bottom-bleed=""
      className="flex h-full min-h-0 flex-1 flex-col"
    >
      <PhotoDetail photoId={parsePhotoId(photoId)} />
    </div>
  );
}
