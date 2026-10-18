import type { ReactNode } from 'react';
import { CreateBunchFrame } from '@/features/onboarding/components/CreateBunchFrame';

// 헤더와 진행 표시줄을 단계 사이에 유지하려고 단계 route를 한 틀로 감쌈(완료 화면은 이 group 밖)
export default function CreateBunchStepsLayout({ children }: { children: ReactNode }) {
  return <CreateBunchFrame>{children}</CreateBunchFrame>;
}
