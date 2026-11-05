import type { Metadata } from 'next';
import { RecommendDetail } from '@/features/bundle/components';
import { BUNDLE_SELECT_PATHS } from '@/features/bundle/constants/selectPaths';
import { parseRecommendationId } from '@/features/bundle/lib/recommendation';

// 번치 멤버의 개인 사진 화면이라 검색에서 제외
export const metadata: Metadata = { title: '추천 번들', robots: { index: false } };

type RecommendDetailPageProps = {
  params: Promise<{ recommendationId: string }>;
};

export default async function RecommendDetailPage({ params }: RecommendDetailPageProps) {
  const { recommendationId } = await params;

  return (
    <div
      data-ssgoi-transition={BUNDLE_SELECT_PATHS.transitionIds.recommendation}
      className="bg-surface-primary flex h-full min-h-0 flex-1 flex-col"
    >
      <RecommendDetail recommendationId={parseRecommendationId(recommendationId)} />
    </div>
  );
}
