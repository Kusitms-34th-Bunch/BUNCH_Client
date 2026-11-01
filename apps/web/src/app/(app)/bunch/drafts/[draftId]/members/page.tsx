import type { Metadata } from 'next';
import { BundleDraftMembers } from '@/features/bundle/components';

// 번치 멤버가 함께 쓰는 작성 중인 번들의 참여 멤버 관리라 검색에서 제외
export const metadata: Metadata = { title: '참여 멤버 관리', robots: { index: false } };

export default function BundleDraftMembersPage() {
  return <BundleDraftMembers />;
}
