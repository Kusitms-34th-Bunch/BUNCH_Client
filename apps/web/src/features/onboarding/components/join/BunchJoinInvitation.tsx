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
  senderName: string;
  imageSrc: string;
};

/** 참여 API 미연결로 완료 화면 이동만 처리; 뒤로 가기 재참여 방지를 위해 replace 적용 */
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
      // 로티의 마지막 원 색(#f1f2ff)과 배경 연결
      className="bg-surface-brand-subtle-1"
      header={
        <Header
          className="bg-transparent"
          leading={
            <HeaderIconButton label="뒤로 가기" onClick={openExitDialog}>
              <LineChevronLeftLargeIcon />
            </HeaderIconButton>
          }
        />
      }
    >
      {/* 로티 배경을 유지하며 내용에만 등장 애니메이션 적용 */}
      <div className="gap-s10 px-padding-p18 pb-padding-p18 flex min-h-full animate-[page-content-in_300ms_ease-out_both] flex-col items-center justify-center motion-reduce:animate-none">
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
