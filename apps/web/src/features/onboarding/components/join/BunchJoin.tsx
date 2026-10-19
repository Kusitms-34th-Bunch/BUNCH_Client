'use client';

import { Button, Header, LineChevronLeftLargeIcon, TextField, toast } from '@app/design-system';
import { PageHeader } from '@app/design-system/web';
import { useRouter } from 'next/navigation';
import { useId, useState } from 'react';
import { HeaderIconButton } from '@/shared/components/layout/HeaderIconButton';
import { PageShell } from '@/shared/components/layout/PageShell';
import { ONBOARDING_PATHS } from '../../constants/paths';
import { useExitFlowDialog } from '../../hooks/useExitFlowDialog';
import { isInviteLink } from '../../lib/inviteLink';

/** 클라이언트 형식 오류와 서버 정원 초과 응답 구분 */
export type JoinFailure = 'invalid' | 'full';

const FAILURE_MESSAGES: Record<JoinFailure, string> = {
  invalid: '유효하지 않은 링크입니다.',
  full: '최대 인원을 초과한 번치입니다.',
};

// Figma의 「완료」 버튼 위 10px 배치를 위한 기본 토스트 위치 보정
const TOAST_BOTTOM_OFFSET = 42;

type BunchJoinProps = {
  /** 서버 검증 실패 사유 또는 성공(null) 반환; API 미연결 시 생략 */
  onSubmit?: ((_inviteLink: string) => Promise<JoinFailure | null>) | undefined;
};

/** 링크 확인 API 미연결 시 형식 검사만 적용; 서버 실패 사유는 onSubmit 결과로 전달 */
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
      // 권한 거부·비보안 환경에서는 입력창에서 직접 붙여넣기 허용
    }
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
      // 뒤로 가기로 링크를 수정할 수 있도록 push 적용
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
