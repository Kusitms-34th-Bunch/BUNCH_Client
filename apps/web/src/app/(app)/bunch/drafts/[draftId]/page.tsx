import type { Metadata } from 'next';
import { BundleDraft } from '@/features/bundle/components';

// 번치 멤버가 함께 쓰는 작성 중인 번들이라 검색에서 제외
export const metadata: Metadata = { title: '번들 작성', robots: { index: false } };

export default function BundleDraftPage() {
  return <BundleDraft />;
}
