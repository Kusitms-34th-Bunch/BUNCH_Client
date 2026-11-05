'use client';

import type { ReactNode } from 'react';
import { Header, LineChevronLeftLargeIcon } from '@app/design-system';
import { useRouter } from 'next/navigation';
import { HeaderIconButton } from '@/shared/components/layout/HeaderIconButton';
import { PageShell } from '@/shared/components/layout/PageShell';

type SignupFrameProps = {
  /** 헤더 가운데 제목(없으면 뒤로 가기만) */
  title?: ReactNode;
  /** 하단 고정 영역(CTA) */
  bottom?: ReactNode;
  children: ReactNode;
};

/** 가입 단계 공통 틀: 고정 헤더(뒤로 가기)와 하단 고정 영역 */
export function SignupFrame({ title, bottom, children }: SignupFrameProps) {
  const router = useRouter();

  return (
    <PageShell
      header={
        <Header
          leading={
            // Figma 헤더 뒤로 가기 아이콘 색(#bcbec2) 적용
            <HeaderIconButton label="뒤로 가기" tone="subtle" onClick={() => router.back()}>
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
