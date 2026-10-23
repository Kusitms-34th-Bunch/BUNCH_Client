import type { Metadata } from 'next';
import { TabPlaceholder } from '@/features/main-navigation/components';

// 임시 탭 화면: 내용이 생길 때까지 검색에서 제외
export const metadata: Metadata = { title: '번치', robots: { index: false } };

export default function BunchPage() {
  return <TabPlaceholder title="번치" />;
}
