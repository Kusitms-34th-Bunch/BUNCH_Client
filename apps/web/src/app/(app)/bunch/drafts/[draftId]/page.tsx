import type { Metadata } from 'next';
import { BundleDraft } from '@/features/bundle/components';
import { parseDraftId } from '@/features/bundle/lib/draftId';

// 번치 멤버가 함께 쓰는 작성 중인 번들이라 검색에서 제외
export const metadata: Metadata = { title: '번들 작성', robots: { index: false } };

type BundleDraftPageProps = {
  params: Promise<{ draftId: string }>;
};

export default async function BundleDraftPage({ params }: BundleDraftPageProps) {
  const { draftId } = await params;

  return <BundleDraft draftId={parseDraftId(draftId)} />;
}
