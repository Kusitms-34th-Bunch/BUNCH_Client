import type { Metadata } from 'next';
import { RecommendViewer } from '@/features/bundle/components';
import { parseRecommendationId } from '@/features/bundle/lib/recommendation';
import { parsePhotoId } from '@/features/photo-box/lib/photoDetail';

// 번치 멤버의 개인 사진 화면이라 검색에서 제외
export const metadata: Metadata = { title: '추천 번들 사진', robots: { index: false } };

type RecommendViewerPageProps = {
  params: Promise<{ recommendationId: string; photoId: string }>;
};

export default async function RecommendViewerPage({ params }: RecommendViewerPageProps) {
  const { recommendationId, photoId } = await params;

  return (
    <RecommendViewer
      recommendationId={parseRecommendationId(recommendationId)}
      photoId={parsePhotoId(photoId)}
    />
  );
}
