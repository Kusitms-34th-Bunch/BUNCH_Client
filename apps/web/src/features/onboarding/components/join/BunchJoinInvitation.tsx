'use client';

import { isApiError } from '@app/api-core';
import { Header, LineChevronLeftLargeIcon, toast } from '@app/design-system';
import { InviteCard } from '@app/design-system/web';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { HeaderIconButton } from '@/shared/components/layout/HeaderIconButton';
import { PageShell } from '@/shared/components/layout/PageShell';
import { PageLoading } from '@/shared/components/loading/PageLoading';
import { defaultBunchImage } from '@/shared/lib/bunchProfile';
import {
  BUNCH_ERROR_CODES,
  INVITATION_ERROR_CODES,
  ONBOARDING_MESSAGES,
} from '../../constants/messages';
import { ONBOARDING_PATHS } from '../../constants/paths';
import { useJoinInvitationFlow } from '../../contexts/joinInvitationContext';
import { useExitFlowDialog } from '../../hooks/useExitFlowDialog';
import { useJoinInvitationMutation } from '../../queries/invitations';
import { InviteReveal } from './InviteReveal';

/** 초대 카드 응답에 번치 성격(`characterType`)이 없어 봉투·인장 색과 기본 이미지는 타입 1로 둠(백엔드 확인 항목) */
const CARD_CHARACTER_TYPE = 'TYPE_1';

/**
 * 링크 입력에서 확인한 초대를 보여 주고 「참여하기」로 서버에 참여(기획 2.6.2·2.6.3)
 * 입장 시 봉투가 열리며 카드가 펼쳐짐. 확인한 초대가 없으면(직접 진입·새로고침) 링크 입력으로 되돌림
 * 참여에 성공하면 뒤로 가기 재참여를 막으려고 replace로 완료 화면에 이동. 다시 해도 안 되는 실패(만료·정원·소속 한도)는 버튼을 잠금
 */
export function BunchJoinInvitation() {
  const router = useRouter();
  const flow = useJoinInvitationFlow();
  const { verified } = flow;
  const join = useJoinInvitationMutation();
  // 같은 틱에 연달아 눌러도 한 번만 보내도록 ref로 막음(state 갱신 전에는 isPending이 아직 false)
  const joining = useRef(false);
  // 다시 해도 안 되는 실패의 이유(토스트는 사라지므로 버튼이 잠긴 동안 안내 영역에 남김)
  const [blockedReason, setBlockedReason] = useState<string | null>(null);

  const openExitDialog = useExitFlowDialog({
    title: '번치 참여를 그만둘까요?',
    description: '지금 나가면 번치에 참여하지 않고 피드로 이동해요.',
    cancelLabel: '계속 참여하기',
    onExit: () => {
      router.replace(ONBOARDING_PATHS.feed);
    },
  });

  useEffect(() => {
    if (!verified) router.replace(ONBOARDING_PATHS.joinBunch);
  }, [verified, router]);

  if (!verified) return null;
  const { invitation, card } = verified;

  const submit = () => {
    if (joining.current) return;
    joining.current = true;
    join.mutate(
      { invitation, idempotencyKey: flow.idempotencyKeyFor(invitation) },
      {
        onSuccess: ({ outcome, bunch }) => {
          if (outcome === 'ALREADY_MEMBER') {
            // 확인한 뒤 다른 곳에서 이미 참여한 경우: 오류로 막지 않고 알린 뒤 번치로 이동
            toast(ONBOARDING_MESSAGES.alreadyMember);
            flow.discardIdempotencyKey();
            router.replace(ONBOARDING_PATHS.feed);
            return;
          }
          // 성공한 요청의 키는 더 쓰지 않음(뒤로 가서 같은 링크로 다시 시도하면 새 키로 서버가 판단)
          flow.discardIdempotencyKey();
          flow.setJoinedBunch(bunch);
          // 중복 참여를 막으려고 replace(성공은 이동이 끝날 때까지 joining을 유지)
          router.replace(ONBOARDING_PATHS.joinBunchComplete);
        },
        onError: (error) => {
          joining.current = false;
          const code = isApiError(error) ? error.code : undefined;
          // 서버가 요청을 거절한 경우(4xx)는 같은 키로 다시 보내면 거절이 재생될 수 있어(서버 정책은 확인 필요) 키를 버림. 408·429는 서버가 처리했을 수 있어 유지
          if (
            isApiError(error) &&
            error.status !== undefined &&
            error.status < 500 &&
            error.status !== 408 &&
            error.status !== 429
          ) {
            flow.discardIdempotencyKey();
          }
          if (code === INVITATION_ERROR_CODES.invalid) {
            toast(ONBOARDING_MESSAGES.invalidInvitation);
            setBlockedReason(ONBOARDING_MESSAGES.invalidInvitation);
          } else if (code === BUNCH_ERROR_CODES.full) {
            toast(ONBOARDING_MESSAGES.fullBunch);
            setBlockedReason(ONBOARDING_MESSAGES.fullBunch);
          } else if (code === BUNCH_ERROR_CODES.limitExceeded) {
            toast(ONBOARDING_MESSAGES.bunchLimit);
            setBlockedReason(ONBOARDING_MESSAGES.bunchLimit);
          } else {
            toast(ONBOARDING_MESSAGES.temporaryFailure);
          }
        },
      },
    );
  };

  return (
    <PageShell
      className="bg-surface-secondary"
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
      {/* 참여 중 상태를 스크린 리더에 알림(화면에는 숨김) */}
      <p role="status" className="sr-only">
        {join.isPending ? '번치에 참여하는 중이에요' : (blockedReason ?? '')}
      </p>
      {join.isPending || join.isSuccess ? <PageLoading /> : null}
      <div className="gap-s10 px-padding-p18 pb-padding-p18 flex min-h-full flex-col items-center justify-center">
        <InviteReveal
          characterType={CARD_CHARACTER_TYPE}
          title={
            <h1 className="typography-title-1-bold text-text-primary text-center break-keep">
              초대받은 번치에 참여할까요?
            </h1>
          }
        >
          <InviteCard
            bunchName={card.name}
            // 소개·초대한 사람이 없으면 해당 줄을 숨김(기획 2.6.2)
            description={card.introduction}
            senderName={card.inviterNickname}
            imageSrc={card.imageUrl ?? defaultBunchImage(CARD_CHARACTER_TYPE)}
            onJoin={submit}
            joinDisabled={blockedReason !== null}
          />
        </InviteReveal>
      </div>
    </PageShell>
  );
}
