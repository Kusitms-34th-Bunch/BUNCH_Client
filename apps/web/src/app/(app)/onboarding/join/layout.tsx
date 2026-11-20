import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { JoinInvitationProvider } from '@/features/onboarding/contexts/JoinInvitationProvider';

// 참여 단계(링크 입력·초대 확인·완료) 공통 제목, 내 계정 흐름이라 검색에서 제외
export const metadata: Metadata = { title: '번치 참여하기', robots: { index: false } };

// 링크 입력 → 초대 확인 → 참여 완료 사이에 확인한 초대와 참여 결과를 유지(화면 전환 틀은 각 page가 가짐)
export default function JoinBunchLayout({ children }: { children: ReactNode }) {
  return <JoinInvitationProvider>{children}</JoinInvitationProvider>;
}
