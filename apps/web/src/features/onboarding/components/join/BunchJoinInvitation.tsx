'use client';

import { isApiError } from '@app/api-core';
import { Header, LineChevronLeftLargeIcon, toast } from '@app/design-system';
import { InviteCard } from '@app/design-system/web';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { isDefiniteRejection } from '@/shared/api/errorStatus';
import { HeaderIconButton } from '@/shared/components/layout/HeaderIconButton';
import { PageShell } from '@/shared/components/layout/PageShell';
import { LATE_OVERLAY_MS, PageLoading } from '@/shared/components/loading/PageLoading';
import { useRefocusWhenEnabled } from '@/shared/hooks/useRefocusWhenEnabled';
import { defaultBunchImage } from '@/shared/lib/bunchProfile';
import { clearPendingInvitation, readPendingInvitation } from '@/shared/lib/pendingInvitation';
import { toastAfterNavigation } from '@/shared/lib/toastAfterNavigation';
import {
  BUNCH_ERROR_CODES,
  INVITATION_ERROR_CODES,
  ONBOARDING_MESSAGES,
} from '../../constants/messages';
import { ONBOARDING_PATHS } from '../../constants/paths';
import { useJoinInvitationFlow } from '../../contexts/joinInvitationContext';
import { useExitFlowDialog } from '../../hooks/useExitFlowDialog';
import { usePrefetchNextSteps } from '../../hooks/usePrefetchNextSteps';
import { useJoinInvitationMutation } from '../../queries/invitations';
import { InviteReveal } from './InviteReveal';

/**
 * 링크 입력에서 확인한 초대를 보여 주고 「참여하기」로 서버에 참여(기획 2.6.2·2.6.3)
 * 입장 시 봉투가 열리며 카드가 펼쳐짐. 확인한 초대가 없으면(직접 진입·새로고침) 링크 입력으로 되돌림
 * 참여에 성공하면 뒤로 가기 재참여를 막으려고 replace로 완료 화면에 이동. 다시 해도 안 되는 실패(만료·정원·소속 한도)는 버튼을 잠금
 */
// 다시 해도 안 되는 참여 실패 코드와 안내 문구(그 밖의 코드는 일시적 오류로 봄)
const BLOCKED_REASONS: Partial<Record<string, string>> = {
  [INVITATION_ERROR_CODES.invalid]: ONBOARDING_MESSAGES.invalidInvitation,
  [BUNCH_ERROR_CODES.full]: ONBOARDING_MESSAGES.fullBunch,
  [BUNCH_ERROR_CODES.limitExceeded]: ONBOARDING_MESSAGES.bunchLimit,
};

export function BunchJoinInvitation() {
  const router = useRouter();
  usePrefetchNextSteps(ONBOARDING_PATHS.joinBunchComplete);
  const flow = useJoinInvitationFlow();
  const { verified } = flow;
  const join = useJoinInvitationMutation();
  // 같은 틱에 연달아 눌러도 한 번만 보내도록 ref로 막음(state 갱신 전에는 isPending이 아직 false)
  const joining = useRef(false);
  // 다시 해도 안 되는 실패의 이유(토스트는 사라지므로 버튼이 잠긴 동안 안내 영역에 남김)
  const [blockedReason, setBlockedReason] = useState<string | null>(null);
  // 참여하는 동안은 덮지 않고 「참여하기」만 비활성(성공하면 완료 화면으로 갈 때까지 유지, motion.md 로딩 상태)
  const joinInFlight = join.isPending || join.isSuccess;
  const [joinRef, refocusJoin] = useRefocusWhenEnabled<HTMLButtonElement>(!joinInFlight);
  // 다시 해도 안 되는 실패면 「참여하기」가 잠겨 초점을 줄 수 없으므로 나갈 수 있는 뒤로 가기로 옮김
  const backRef = useRef<HTMLButtonElement>(null);

  const openExitDialog = useExitFlowDialog({
    title: '번치 참여를 그만둘까요?',
    description: '지금 나가면 번치에 참여하지 않고 피드로 이동해요.',
    cancelLabel: '계속 참여하기',
    onExit: () => {
      // 참여를 그만두면 보관한 초대도 지움(다음 로그인 때 다시 초대로 보내지 않게)
      clearPendingInvitation();
      router.replace(ONBOARDING_PATHS.feed);
    },
  });

  useEffect(() => {
    // 초대 링크로 들어온 사용자는 새로고침으로 확인한 초대가 사라져도 보관된 초대로 다시 확인하고, 아니면 링크 입력으로
    if (!verified) {
      router.replace(
        readPendingInvitation() !== null
          ? ONBOARDING_PATHS.joinBunchEnter
          : ONBOARDING_PATHS.joinBunch,
      );
    }
  }, [verified, router]);

  if (!verified) return null;
  const { invitation, card } = verified;

  const submit = () => {
    if (joining.current) return;
    joining.current = true;
    // 실패해 다시 켜지면 초점을 돌려줌(성공하면 완료 화면으로 이동)
    refocusJoin();
    join.mutate(
      { invitation, idempotencyKey: flow.idempotencyKeyFor(invitation) },
      {
        onSuccess: ({ outcome, bunch }) => {
          if (outcome === 'ALREADY_MEMBER') {
            // 확인한 뒤 다른 곳에서 이미 참여한 경우: 오류로 막지 않고 알린 뒤 번치로 이동
            toastAfterNavigation(ONBOARDING_MESSAGES.alreadyMember);
            clearPendingInvitation();
            flow.discardIdempotencyKey();
            router.replace(ONBOARDING_PATHS.feed);
            return;
          }
          // 성공한 요청의 키는 더 쓰지 않음(뒤로 가서 같은 링크로 다시 시도하면 새 키로 서버가 판단)
          flow.discardIdempotencyKey();
          // 참여를 마쳤으니 보관한 초대를 지움(기능명세 1.5.1)
          clearPendingInvitation();
          flow.setJoinedBunch(bunch);
          // 중복 참여를 막으려고 replace(성공은 이동이 끝날 때까지 joining을 유지)
          router.replace(ONBOARDING_PATHS.joinBunchComplete);
        },
        onError: (error) => {
          joining.current = false;
          const code = isApiError(error) ? error.code : undefined;
          // 서버가 요청을 거절한 경우(4xx)는 같은 키로 다시 보내면 거절이 재생될 수 있어(서버 정책은 확인 필요) 키를 버림. 408·429는 서버가 처리했을 수 있어 유지
          if (isDefiniteRejection(error)) flow.discardIdempotencyKey();
          const blocked = code === undefined ? undefined : BLOCKED_REASONS[code];
          if (blocked === undefined) {
            toast(ONBOARDING_MESSAGES.temporaryFailure);
            return;
          }
          toast(blocked);
          clearPendingInvitation();
          setBlockedReason(blocked);
          backRef.current?.focus();
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
            <HeaderIconButton
              ref={backRef}
              label="뒤로 가기"
              // 참여 요청 중·성공 뒤 이동 중에는 나가기 창을 열지 않음(늦게 온 성공이 창 뒤에서 화면을 옮기지 않게)
              onClick={() => {
                if (!joinInFlight) openExitDialog();
              }}
            >
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
      {/* 짧은 동작이라 버튼만 비활성, 1초를 넘기면 그때 덮음(motion.md 로딩 상태) */}
      {joinInFlight ? <PageLoading delayMs={LATE_OVERLAY_MS} /> : null}
      <div className="gap-s10 px-padding-p18 pb-padding-p18 flex min-h-full flex-col items-center justify-center">
        <InviteReveal
          characterType={card.characterType}
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
            imageSrc={card.imageUrl ?? defaultBunchImage(card.characterType)}
            onJoin={submit}
            joinDisabled={blockedReason !== null || joinInFlight}
            joinBusy={join.isPending}
            joinRef={joinRef}
          />
        </InviteReveal>
      </div>
    </PageShell>
  );
}
