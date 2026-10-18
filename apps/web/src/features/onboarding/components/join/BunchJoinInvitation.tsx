'use client';

import { Header, LineChevronLeftLargeIcon } from '@app/design-system';
import { InviteCard } from '@app/design-system/web';
import { useRouter } from 'next/navigation';
import { useRef } from 'react';
import { PageShell } from '@/shared/components/layout/PageShell';
import { ONBOARDING_PATHS } from '../../constants/paths';
import { useExitFlowDialog } from '../../hooks/useExitFlowDialog';
import { HeaderIconButton } from '../HeaderIconButton';

type BunchJoinInvitationProps = {
  bunchName: string;
  description: string;
  /** 초대한 사람 이름 */
  senderName: string;
  imageSrc: string;
};

/**
 * 초대받은 번치의 정보를 보여 주고 참여할지 묻는 화면: 번치 이름·소개·대표 이미지·초대한 사람과 「참여하기」
 * 뒤로 가기는 중단 확인 모달을 연다. 「참여하기」는 참여 완료 화면으로 `replace`한다(뒤로 가기로 다시 참여하지 않게)
 * 참여 요청 API가 없어 요청 없이 이동만 한다(spec 확인할 항목)
 */
export function BunchJoinInvitation({
  bunchName,
  description,
  senderName,
  imageSrc,
}: BunchJoinInvitationProps) {
  const router = useRouter();
  const joining = useRef(false);

  const openExitDialog = useExitFlowDialog({
    title: '번치 참여를 그만둘까요?',
    description: '지금 나가면 번치에 참여하지 않고 피드로 이동해요.',
    cancelLabel: '계속 참여하기',
    onExit: () => router.replace(ONBOARDING_PATHS.feed),
  });

  const join = () => {
    // 처리 중 중복 탭 방지(설계서 3-2)
    if (joining.current) return;
    joining.current = true;
    router.replace(ONBOARDING_PATHS.joinBunchComplete);
  };

  return (
    <PageShell
      // 초대장 로티가 끝나는 원 색(#f1f2ff)과 같은 의미 토큰
      className="bg-surface-brand-subtle-1"
      header={
        <Header
          // 배경이 연보라라 헤더도 투명하게 둔다
          className="bg-transparent"
          leading={
            <HeaderIconButton label="뒤로 가기" onClick={openExitDialog}>
              <LineChevronLeftLargeIcon />
            </HeaderIconButton>
          }
        />
      }
    >
      <div className="gap-s10 px-padding-p18 pb-padding-p18 flex min-h-full flex-col items-center justify-center">
        <h1 className="typography-title-1-bold text-text-primary text-center break-keep">
          초대받은 번치에 참여할까요?
        </h1>
        <InviteCard
          bunchName={bunchName}
          description={description}
          senderName={senderName}
          imageSrc={imageSrc}
          onJoin={join}
        />
      </div>
    </PageShell>
  );
}
