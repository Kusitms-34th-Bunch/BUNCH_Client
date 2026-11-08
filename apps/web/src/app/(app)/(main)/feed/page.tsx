import type { Metadata } from 'next';
import { MainTabPage } from '@/features/main-navigation/components';
import { FeedRoute } from './FeedRoute';

// 로그인한 사람의 피드라 검색에서 제외
export const metadata: Metadata = { title: '피드', robots: { index: false } };

export default function FeedPage() {
  return (
    <MainTabPage tab="feed">
      <FeedRoute />
    </MainTabPage>
  );
}
