'use client';

import { isApiError } from '@app/api-core';
import { Button, Header, LineChevronLeftLargeIcon, TextField, toast } from '@app/design-system';
import { PageHeader } from '@app/design-system/web';
import { useRouter } from 'next/navigation';
import { useId, useRef, useState } from 'react';
import { HeaderIconButton } from '@/shared/components/layout/HeaderIconButton';
import { PageShell } from '@/shared/components/layout/PageShell';
import { PageLoading } from '@/shared/components/loading/PageLoading';
import { INVITATION_ERROR_CODES, ONBOARDING_MESSAGES } from '../../constants/messages';
import { ONBOARDING_PATHS } from '../../constants/paths';
import { useJoinInvitationFlow } from '../../contexts/joinInvitationContext';
import { useExitFlowDialog } from '../../hooks/useExitFlowDialog';
import { isInviteInput } from '../../lib/inviteLink';
import { useVerifyInvitationMutation } from '../../queries/invitations';

/**
 * 초대받은 번치 참여의 첫 화면: 초대 링크(또는 코드)를 입력하고 「완료」로 서버에 확인
 * 참여할 수 있는 초대면 확인한 카드를 흐름 상태에 남기고 초대 확인 화면으로 이동. 이 단계에서는 참여하지 않음
 * 참여할 수 없으면(무효·정원·소속 한도·이미 참여) 화면에 머물며 이유를 토스트로 알리고 입력값은 그대로 둠(기획 2.5.4)
 */
export function BunchJoin() {
  const router = useRouter();
  const inputId = useId();
  const [link, setLink] = useState('');
  const flow = useJoinInvitationFlow();
  const verify = useVerifyInvitationMutation();
  // 같은 틱에 연달아 눌러도 한 번만 보내도록 ref로 막음(state 갱신 전에는 isPending이 아직 false)
  const submitted = useRef(false);

  const openExitDialog = useExitFlowDialog({
    title: '번치 참여를 그만둘까요?',
    description: '지금 나가면 번치에 참여하지 않고 피드로 이동해요.',
    cancelLabel: '계속 참여하기',
    onExit: () => router.replace(ONBOARDING_PATHS.feed),
  });

  const paste = async () => {
    try {
      setLink((await navigator.clipboard.readText()).trim());
    } catch {
      // 권한 거부·비보안 환경에서는 입력창에서 직접 붙여넣기 허용
    }
    document.getElementById(inputId)?.focus();
  };

  const submit = () => {
    const value = link.trim();
    if (submitted.current) return;
    // 형식이 아니면 서버에 묻지 않음(무효 입력 횟수 제한에 걸리지 않게)
    if (!isInviteInput(value)) {
      toast(ONBOARDING_MESSAGES.invalidInvitation);
      return;
    }
    submitted.current = true;
    verify.mutate(value, {
      onSuccess: ({ card, eligibility }) => {
        submitted.current = false;
        if (eligibility === 'AVAILABLE') {
          flow.setVerified({ invitation: value, card });
          // 뒤로 가기로 링크를 수정할 수 있도록 push 적용
          router.push(ONBOARDING_PATHS.joinBunchInvitation);
        } else if (eligibility === 'ALREADY_MEMBER') {
          // 오류로 막지 않고 알린 뒤 번치로 이동(기획 2.5.4)
          toast(ONBOARDING_MESSAGES.alreadyMember);
          router.replace(ONBOARDING_PATHS.feed);
        } else {
          toast(
            eligibility === 'FULL' ? ONBOARDING_MESSAGES.fullBunch : ONBOARDING_MESSAGES.bunchLimit,
          );
        }
      },
      onError: (error) => {
        submitted.current = false;
        // 없거나 만료·폐기된 초대는 서버가 구분하지 않아 같은 문구(링크 존재 여부를 드러내지 않음)
        toast(
          isApiError(error) && error.code === INVITATION_ERROR_CODES.invalid
            ? ONBOARDING_MESSAGES.invalidInvitation
            : ONBOARDING_MESSAGES.temporaryFailure,
        );
      },
    });
  };

  return (
    <PageShell
      header={
        <Header
          leading={
            <HeaderIconButton label="뒤로 가기" onClick={openExitDialog}>
              <LineChevronLeftLargeIcon />
            </HeaderIconButton>
          }
        />
      }
      bottom={
        <div className="pt-padding-p5 px-padding-p8">
          <Button
            className="w-full"
            disabled={link.trim() === '' || verify.isPending}
            onClick={submit}
          >
            완료
          </Button>
        </div>
      }
    >
      {/* 확인 중 상태를 스크린 리더에 알림(화면에는 숨김) */}
      <p role="status" className="sr-only">
        {verify.isPending ? '초대를 확인하는 중이에요' : ''}
      </p>
      {verify.isPending ? <PageLoading /> : null}
      <PageHeader title="초대받은 번치에 참여해볼까요?" />
      <div className="pt-s6 px-padding-p8">
        <TextField
          id={inputId}
          label="초대 링크"
          placeholder="초대 링크를 붙여넣어 주세요"
          value={link}
          onChange={(event) => setLink(event.target.value)}
          inputMode="url"
          autoComplete="off"
          autoCapitalize="none"
          spellCheck={false}
          action={
            <Button variant="brandSubtle" size="sm" onClick={() => void paste()}>
              붙여넣기
            </Button>
          }
        />
      </div>
    </PageShell>
  );
}
