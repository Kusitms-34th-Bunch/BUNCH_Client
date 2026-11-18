import type { ReactNode } from 'react';
import { JoinInvitationProvider } from '@/features/onboarding/contexts/JoinInvitationProvider';

// 링크 입력 → 초대 확인 → 참여 완료 사이에 확인한 초대와 참여 결과를 유지(화면 전환 틀은 각 page가 가짐)
export default function JoinBunchLayout({ children }: { children: ReactNode }) {
  return <JoinInvitationProvider>{children}</JoinInvitationProvider>;
}
