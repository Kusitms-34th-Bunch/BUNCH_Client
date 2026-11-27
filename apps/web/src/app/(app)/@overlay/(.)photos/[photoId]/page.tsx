import type { Metadata } from 'next';
import { PhotoDetail } from '@/features/photo-box/components';
import { parsePhotoId } from '@/features/photo-box/lib/photoDetail';
import { PhotoDetailOverlay } from './_components/PhotoDetailOverlay';

// 앱 안 이동으로 겹쳐 열어도 단독 상세와 같은 제목·검색 제외(번치 멤버의 개인 사진)
export const metadata: Metadata = { title: '사진 상세', robots: { index: false } };

type PhotoDetailOverlayPageProps = {
  params: Promise<{ photoId: string }>;
};

/**
 * 사진함에서 연 사진 상세는 사진함을 유지한 채 위에 띄움(#598)
 * 돌아올 때 사진함을 새로 그리면 WebKit에서 사진 칸이 몇 프레임 비었음. 새로 열기·새로고침은 `photos/[photoId]` page
 */
export default async function PhotoDetailOverlayPage({ params }: PhotoDetailOverlayPageProps) {
  const { photoId } = await params;
  return (
    <PhotoDetailOverlay>
      <PhotoDetail photoId={parsePhotoId(photoId)} />
    </PhotoDetailOverlay>
  );
}
