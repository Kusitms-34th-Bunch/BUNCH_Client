import type { ReactNode } from 'react';
import { CreateBunchDraftProvider } from '@/features/onboarding/model/CreateBunchDraftProvider';

// 번치 만들기 단계 사이에 입력값을 유지하려고 단계 route를 한 provider로 감쌈
export default function CreateBunchLayout({ children }: { children: ReactNode }) {
  return <CreateBunchDraftProvider>{children}</CreateBunchDraftProvider>;
}
