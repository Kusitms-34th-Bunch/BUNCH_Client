'use client';

import { isApiError } from '@app/api-core';
import { toast } from '@app/design-system';
import { useRouter } from 'next/navigation';
import { useEffect, useRef } from 'react';
import { PageShell } from '@/shared/components/layout/PageShell';
import { PageLoading } from '@/shared/components/loading/PageLoading';
import { clearPendingInvitation, readPendingInvitation } from '@/shared/lib/pendingInvitation';
import { INVITATION_ERROR_CODES, ONBOARDING_MESSAGES } from '../../constants/messages';
import { ONBOARDING_PATHS } from '../../constants/paths';
import { useJoinInvitationFlow } from '../../contexts/joinInvitationContext';
import { useVerifyInvitationMutation } from '../../queries/invitations';

/**
 * 초대 링크로 들어온 사용자의 진입(기능명세 2.7.2): 보관된 초대를 서버에 확인하고 초대 확인 화면으로 이어 줌
 * 로그인한 사용자만 올 수 있음(비로그인·가입 중은 접근 가드가 로그인·가입 단계로 보냄). 화면 없이 확인하는 동안 로딩만 보임
 * 참여할 수 있으면(소속이 10개여도 카드는 보여 주고 「참여하기」에서 막음) 초대 확인 화면, 이미 참여 중이면 알린 뒤 번치로,
 * 정원 초과·무효 링크는 이유를 알리고 보관한 초대를 지운 뒤 번치 시작으로, 일시적 오류는 알리고 초대는 보관한 채 번치 시작으로(기능명세 2.6.1)
 */
export function BunchJoinEntry() {
  const router = useRouter();
  const flow = useJoinInvitationFlow();
  const { mutateAsync } = useVerifyInvitationMutation();
  // 개발 모드의 effect 이중 실행과 재렌더에도 확인 요청은 한 번만 보냄
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    const invitation = readPendingInvitation();
    if (!invitation) {
      // 보관된 초대가 없으면(직접 주소 입력·이미 처리됨) 번치 시작으로
      router.replace(ONBOARDING_PATHS.start);
      return;
    }

    const leave = (message: string, { clear }: { clear: boolean }) => {
      if (clear) clearPendingInvitation();
      toast(message);
      router.replace(ONBOARDING_PATHS.start);
    };

    mutateAsync(invitation).then(
      ({ card, eligibility }) => {
        if (eligibility === 'AVAILABLE' || eligibility === 'LIMIT_EXCEEDED') {
          flow.setVerified({ invitation, card });
          // 뒤로 가기로 진입 화면(로딩)에 돌아오지 않게 replace
          router.replace(ONBOARDING_PATHS.joinBunchInvitation);
        } else if (eligibility === 'ALREADY_MEMBER') {
          // 오류로 막지 않고 알린 뒤 번치로 이동
          clearPendingInvitation();
          toast(ONBOARDING_MESSAGES.alreadyMember);
          router.replace(ONBOARDING_PATHS.feed);
        } else {
          leave(ONBOARDING_MESSAGES.fullBunch, { clear: true });
        }
      },
      (error: unknown) => {
        // 없거나 만료·폐기된 초대는 다시 해도 안 되므로 지우고, 일시적 오류는 보관한 채 둠
        if (isApiError(error) && error.code === INVITATION_ERROR_CODES.invalid) {
          leave(ONBOARDING_MESSAGES.invalidInvitation, { clear: true });
        } else {
          leave(ONBOARDING_MESSAGES.temporaryFailure, { clear: false });
        }
      },
    );
    // 의존 값이 바뀌어 effect가 다시 돌아도 `started`가 요청을 한 번으로 막음
  }, [flow, mutateAsync, router]);

  return (
    <PageShell>
      {/* 화면 이동 때 초점이 갈 제목(보이지 않음)과 확인 중 안내 */}
      <h1 className="sr-only">초대장 확인</h1>
      <p role="status" className="sr-only">
        초대를 확인하는 중이에요
      </p>
      <PageLoading />
    </PageShell>
  );
}
