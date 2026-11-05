import type { ReactNode } from 'react';
import { CreateBunchFrame } from '@/features/onboarding/components';

// 헤더와 진행 표시줄을 단계 사이에 유지하려고 단계 route를 한 틀로 감쌈(완료 화면은 이 group 밖)
export default function CreateBunchStepsLayout({ children }: { children: ReactNode }) {
  return (
    <div
      data-ssgoi-transition="/onboarding/create/steps"
      className="bg-surface-primary flex h-full min-h-0 flex-1 flex-col"
    >
      <CreateBunchFrame>{children}</CreateBunchFrame>
    </div>
  );
}
