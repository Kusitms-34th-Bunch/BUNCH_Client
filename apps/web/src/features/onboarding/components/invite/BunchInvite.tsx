'use client';

import {
  Header,
  LineAlertSmallIcon,
  LineCloseLargeIcon,
  LineCopyLargeIcon,
  TextField,
  toast,
} from '@app/design-system';
import { PageHeader } from '@app/design-system/web';
import { captureException } from '@sentry/nextjs';
import { useRouter } from 'next/navigation';
import { useId } from 'react';
import { HeaderIconButton } from '@/shared/components/layout/HeaderIconButton';
import { PageShell } from '@/shared/components/layout/PageShell';
import { ONBOARDING_PATHS } from '../../constants/paths';

// 보이는 라벨과 입력창의 접근성 이름 일치
const LINK_LABEL = '초대 링크';
// Figma 기준 홈 인디케이터 포함 하단 82px 위치를 위해 기본 위치에서 32px 상향
const TOAST_BOTTOM_OFFSET = 32;

type BunchInviteProps = {
  /** 멤버에게 보낼 초대 링크 */
  inviteLink: string;
};

export function BunchInvite({ inviteLink }: BunchInviteProps) {
  const router = useRouter();
  const linkId = useId();

  const leave = () => router.replace(ONBOARDING_PATHS.feed);

  const share = async () => {
    if (!navigator.share) {
      toast('공유를 지원하지 않는 환경이에요. 복사한 링크를 직접 보내주세요.', {
        bottomOffset: TOAST_BOTTOM_OFFSET,
      });
      return;
    }
    try {
      await navigator.share({ url: inviteLink });
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') return;
      captureException(error);
      toast('공유하지 못했어요. 복사한 링크를 직접 보내주세요.', {
        bottomOffset: TOAST_BOTTOM_OFFSET,
      });
    }
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(inviteLink);
      toast('초대 링크가 복사되었어요.', {
        action:
          typeof navigator.share === 'function'
            ? { label: '공유', onClick: () => void share() }
            : undefined,
        bottomOffset: TOAST_BOTTOM_OFFSET,
        fullWidth: true,
      });
    } catch {
      // 권한 거부·비보안 컨텍스트의 복사 실패 안내
      toast('초대 링크를 복사하지 못했어요.', { bottomOffset: TOAST_BOTTOM_OFFSET });
    }
  };

  return (
    <PageShell
      header={
        <Header
          leading={
            <HeaderIconButton label="닫기" onClick={leave}>
              <LineCloseLargeIcon />
            </HeaderIconButton>
          }
        />
      }
      bottom={
        <div className="flex justify-center">
          <button
            type="button"
            onClick={leave}
            className="typography-body-4-regular text-text-tertiary px-padding-p5 py-padding-p4 focus-visible:outline-border-brand cursor-pointer underline focus-visible:outline-2 focus-visible:outline-offset-2"
          >
            나중에 할게요
          </button>
        </div>
      }
    >
      <PageHeader
        title="함께 기록할 멤버를 초대해보세요"
        description="초대 링크를 보내면 친구가 번치에 참여할 수 있어요."
      />
      <section className="pt-s17 px-padding-p8 gap-s3 flex flex-col">
        <div className="flex items-center justify-between">
          <label htmlFor={linkId} className="typography-body-3-semi-bold text-text-primary">
            {LINK_LABEL}
          </label>
          <button
            type="button"
            aria-label="초대 링크 복사"
            onClick={() => void copy()}
            className="text-icon-primary focus-visible:outline-border-brand -my-s4 -mr-s4 size-s16 flex cursor-pointer items-center justify-center rounded-full focus-visible:outline-2 focus-visible:outline-offset-2"
          >
            <LineCopyLargeIcon />
          </button>
        </div>
        <TextField id={linkId} label={LINK_LABEL} readOnly value={inviteLink} />
        <p className="bg-surface-secondary rounded-r3 px-padding-p8 py-padding-p5 gap-s3 typography-body-3-regular text-text-tertiary flex items-center">
          <LineAlertSmallIcon className="text-icon-tertiary shrink-0" />
          번치는 최대 8명까지 함께할 수 있어요.
        </p>
      </section>
    </PageShell>
  );
}
