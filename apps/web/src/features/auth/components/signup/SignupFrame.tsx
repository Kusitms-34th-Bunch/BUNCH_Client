'use client';

import type { ReactNode } from 'react';
import { Header, LineChevronLeftLargeIcon } from '@app/design-system';
import { useRouter } from 'next/navigation';
import { HeaderIconButton } from '@/shared/components/layout/HeaderIconButton';
import { PageShell } from '@/shared/components/layout/PageShell';
import { useBackOr } from '@/shared/hooks/useBackOr';

type SignupFrameProps = {
  /** 헤더 가운데 제목(없으면 뒤로 가기만) */
  title?: ReactNode;
  /** 하단 고정 영역(CTA) */
  bottom?: ReactNode;
  /** 직접 진입이라 돌아갈 기록이 없을 때 뒤로 가기로 갈 경로(없으면 기록만 따라감) */
  backFallback?: string | undefined;
  /** 있으면 뒤로 가기를 이 동작이 대신함(약관 화면의 로그아웃 등) */
  onBack?: (() => void) | undefined;
  children: ReactNode;
};

/** 가입 단계 공통 틀: 고정 헤더(뒤로 가기)와 하단 고정 영역 */
export function SignupFrame({ title, bottom, backFallback, onBack, children }: SignupFrameProps) {
  const router = useRouter();
  const backOr = useBackOr();

  return (
    <PageShell
      header={
        <Header
          leading={
            // Figma 헤더 뒤로 가기 아이콘 색(#bcbec2) 적용
            <HeaderIconButton
              label="뒤로 가기"
              tone="subtle"
              onClick={() => {
                if (onBack) onBack();
                else if (backFallback) backOr(backFallback);
                else router.back();
              }}
            >
              <LineChevronLeftLargeIcon />
            </HeaderIconButton>
          }
          title={title}
        />
      }
      bottom={bottom}
    >
      {children}
    </PageShell>
  );
}
