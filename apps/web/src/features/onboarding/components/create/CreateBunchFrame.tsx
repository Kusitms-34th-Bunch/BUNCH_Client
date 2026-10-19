'use client';

import type { ReactNode } from 'react';
import { Header, LineChevronLeftLargeIcon } from '@app/design-system';
import { Stepper } from '@app/design-system/web';
import { useSelectedLayoutSegment } from 'next/navigation';
import { HeaderIconButton } from '@/shared/components/layout/HeaderIconButton';
import { useExitCreateBunchDialog } from '../../hooks/useExitCreateBunchDialog';

const TOTAL_STEPS = 3;
// 단계 route 폴더 이름과 불일치하면 1단계로 표시
const STEP_BY_SEGMENT: Record<string, number> = { description: 2, mood: 3 };

// 공통 layout에서 유지해 단계 이동 시 진행 표시줄 색 전환 유지
export function CreateBunchFrame({ children }: { children: ReactNode }) {
  const segment = useSelectedLayoutSegment();
  const step = (segment !== null ? STEP_BY_SEGMENT[segment] : undefined) ?? 1;
  const openExitDialog = useExitCreateBunchDialog();

  return (
    <div className="bg-surface-primary flex min-h-0 flex-1 flex-col">
      <div className="shrink-0">
        <Header
          leading={
            <HeaderIconButton label="뒤로 가기" onClick={openExitDialog}>
              <LineChevronLeftLargeIcon />
            </HeaderIconButton>
          }
        />
        <div className="bg-surface-primary px-padding-p8 pt-padding-p6">
          <Stepper total={TOTAL_STEPS} current={step} />
        </div>
      </div>
      {children}
    </div>
  );
}
