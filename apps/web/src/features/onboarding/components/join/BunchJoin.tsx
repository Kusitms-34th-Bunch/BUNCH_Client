'use client';

import { Button, Header, LineChevronLeftLargeIcon, TextField, toast } from '@app/design-system';
import { PageHeader } from '@app/design-system/web';
import { useRouter } from 'next/navigation';
import { useId, useState } from 'react';
import { PageShell } from '@/shared/components/layout/PageShell';
import { ONBOARDING_PATHS } from '../../constants/paths';
import { useExitFlowDialog } from '../../hooks/useExitFlowDialog';
import { HeaderIconButton } from '../HeaderIconButton';
import { isInviteLink } from './inviteLink';

/** 참여할 수 없는 이유. `invalid`는 형식이 틀렸을 때 화면이 정하고, `full` 등 서버가 아는 이유는 `onSubmit`이 돌려준다 */
export type JoinFailure = 'invalid' | 'full';

const FAILURE_MESSAGES: Record<JoinFailure, string> = {
  invalid: '유효하지 않은 링크입니다.',
  full: '최대 인원을 초과한 번치입니다.',
};

// Figma: 토스트가 「완료」 버튼 위 10px에 놓인다(아래에서 버튼 영역 58px + 10px). Toaster 기본(Safe Area + 16px)에서 위로 올릴 간격
const TOAST_BOTTOM_OFFSET = 42;

type BunchJoinProps = {
  /** 형식이 맞는 링크를 서버에서 확인한다. 실패 이유를 돌려주면 토스트로 알리고, 성공하면 null(이동). 링크 확인 API가 없어 지금은 넘기지 않는다 */
  onSubmit?: ((_inviteLink: string) => Promise<JoinFailure | null>) | undefined;
};

/**
 * 초대받은 번치에 참여하는 첫 화면: 초대 링크를 붙여넣거나 입력하고 「완료」를 누른다
 * 형식이 틀린 링크는 여기서, 인원 초과 같은 서버가 아는 이유는 `onSubmit`의 결과로 토스트에 알린다
 * 뒤로 가기는 중단 확인 모달을 연다. 링크가 확인되면 로딩(초대장 로티) 화면으로 이동한다
 */
export function BunchJoin({ onSubmit }: BunchJoinProps) {
  const router = useRouter();
  const inputId = useId();
  const [link, setLink] = useState('');
  const [submitting, setSubmitting] = useState(false);

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
      // 클립보드 읽기가 막혀도(권한 거부·비보안 환경) 아래에서 입력창에 초점을 줘서 직접 붙여넣게 한다
    }
    // 성공하면 채워진 값이 읽히고, 실패하면 직접 붙여넣을 자리로 초점이 간다
    document.getElementById(inputId)?.focus();
  };

  const submit = async () => {
    const value = link.trim();
    setSubmitting(true);
    try {
      const failure = isInviteLink(value) ? ((await onSubmit?.(value)) ?? null) : 'invalid';
      if (failure) {
        toast(FAILURE_MESSAGES[failure], { bottomOffset: TOAST_BOTTOM_OFFSET, fullWidth: true });
        return;
      }
      // 링크를 확인하는 동안 초대장 로티를 재생하는 화면으로 간다. 뒤로 가기로 이 입력 화면에 돌아올 수 있다
      router.push(ONBOARDING_PATHS.joinBunchMotion);
    } finally {
      setSubmitting(false);
    }
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
            disabled={link.trim() === '' || submitting}
            onClick={() => void submit()}
          >
            완료
          </Button>
        </div>
      }
    >
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
