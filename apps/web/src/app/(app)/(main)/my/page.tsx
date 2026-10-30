import type { Metadata } from 'next';
import { TabPlaceholder } from '@/features/main-navigation/components';

// 임시 탭 화면: 내용이 생길 때까지 검색에서 제외
export const metadata: Metadata = { title: '마이페이지', robots: { index: false } };

export default function MyPage() {
  return <TabPlaceholder title="마이페이지" />;
}
