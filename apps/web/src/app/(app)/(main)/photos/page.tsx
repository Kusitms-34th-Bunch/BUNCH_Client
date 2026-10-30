import type { Metadata } from 'next';
import { TabPlaceholder } from '@/features/main-navigation/components';

// 임시 탭 화면: 내용이 생길 때까지 검색에서 제외
export const metadata: Metadata = { title: '사진함', robots: { index: false } };

export default function PhotosPage() {
  return <TabPlaceholder title="사진함" />;
}
