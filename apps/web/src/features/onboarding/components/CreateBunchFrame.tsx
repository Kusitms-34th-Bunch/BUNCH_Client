'use client';

import type { ReactNode } from 'react';
import { Header, LineChevronLeftLargeIcon } from '@app/design-system';
import { Stepper } from '@app/design-system/web';
import { useSelectedLayoutSegment } from 'next/navigation';
import { HeaderIconButton } from './HeaderIconButton';
import { useExitCreateBunchDialog } from './useExitCreateBunchDialog';

const TOTAL_STEPS = 3;
// 단계 route 폴더 이름과 맞춰야 함(어긋나면 조용히 1단계로 보임)
const STEP_BY_SEGMENT: Record<string, number> = { description: 2, mood: 3 };

/**
 * 번치 만들기 1~3단계가 함께 쓰는 틀: 헤더(뒤로 가기)와 진행 표시줄
 * 단계 route의 공통 layout에 놓여 단계를 넘어가도 계속 남아 있어서, 진행 표시줄 막대 색이 이어서 전환됨
 * 주소 조각(`description`, `mood`)으로 현재 단계를 정하고, 주소 조각이 없는 첫 route가 1단계
 */
export function CreateBunchFrame({ children }: { children: ReactNode }) {
  const segment = useSelectedLayoutSegment();
  const step = (segment !== null ? STEP_BY_SEGMENT[segment] : undefined) ?? 1;
  const openExitDialog = useExitCreateBunchDialog();

  return (
    <div className="flex min-h-0 flex-1 flex-col">
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
