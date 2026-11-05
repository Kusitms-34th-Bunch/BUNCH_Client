import type { Metadata } from 'next';
import { PhotoDetail } from '@/features/photo-box/components';
import { parsePhotoId } from '@/features/photo-box/lib/photoDetail';

// 번치 멤버의 개인 사진 화면이라 검색에서 제외
export const metadata: Metadata = { title: '사진 상세', robots: { index: false } };

type PhotoDetailPageProps = {
  params: Promise<{ photoId: string }>;
};

export default async function PhotoDetailPage({ params }: PhotoDetailPageProps) {
  const { photoId } = await params;

  return <PhotoDetail photoId={parsePhotoId(photoId)} />;
}
