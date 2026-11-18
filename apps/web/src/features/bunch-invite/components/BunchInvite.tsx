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
import { PageLoading } from '@/shared/components/loading/PageLoading';
import { copyText } from '@/shared/lib/clipboard';

// 보이는 라벨과 입력창의 접근성 이름 일치
const LINK_LABEL = '초대 링크';
type BunchInviteProps = {
  /** 멤버에게 보낼 초대 링크. 아직 받지 못했으면 없음(복사·공유 불가) */
  inviteLink: string | undefined;
  /** 링크를 불러오는 중이면 페이지 전체 로딩을 덮고, 링크가 채워지면 풀림 */
  loading?: boolean | undefined;
  /** 링크를 불러오지 못했을 때 「다시 불러오기」로 호출. 없으면 불러오기 실패 표시를 하지 않음 */
  onRetry?: (() => void) | undefined;
  /** 닫기·「나중에 할게요」로 갈 경로(번치 만들기 직후는 피드, 멤버 관리에서는 멤버 관리) */
  leaveHref: string;
  /** 돌아갈 기록이 있으면 뒤로 가기로 닫음(멤버 관리·더보기 메뉴에서 들어온 경우) */
  backOnLeave?: boolean | undefined;
};

/** 번치 멤버 초대: 초대 링크 복사·공유. 번치 만들기 완료와 번치 관리 두 곳에서 들어옴 */
export function BunchInvite({
  inviteLink,
  loading,
  onRetry,
  leaveHref,
  backOnLeave,
}: BunchInviteProps) {
  const router = useRouter();
  const linkId = useId();

  const leave = () =>
    backOnLeave && window.history.length > 1 ? router.back() : router.replace(leaveHref);

  const share = async () => {
    if (!inviteLink) return;
    if (!navigator.share) {
      toast('공유를 지원하지 않는 환경이에요. 복사한 링크를 직접 보내주세요.');
      return;
    }
    try {
      await navigator.share({ url: inviteLink });
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') return;
      captureException(error);
      toast('공유하지 못했어요. 복사한 링크를 직접 보내주세요.');
    }
  };

  const copy = async () => {
    if (!inviteLink) return;
    // 쉘에서는 네이티브 클립보드, 브라우저에서는 navigator.clipboard(권한 거부·비보안 컨텍스트면 실패)
    if (!(await copyText(inviteLink))) {
      toast('초대 링크를 복사하지 못했어요.');
      return;
    }
    toast('초대 링크가 복사되었어요.', {
      action:
        typeof navigator.share === 'function'
          ? { label: '공유', onClick: () => void share() }
          : undefined,
    });
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
          <label htmlFor={linkId} className="typography-body-3-semibold text-text-primary">
            {LINK_LABEL}
          </label>
          <button
            type="button"
            aria-label="초대 링크 복사"
            disabled={!inviteLink}
            onClick={() => void copy()}
            className="text-icon-quaternary focus-visible:outline-border-brand -my-s4 -mr-s4 size-s16 flex cursor-pointer items-center justify-center rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <LineCopyLargeIcon />
          </button>
        </div>
        {loading ? <PageLoading /> : null}
        {/* 상태 변화는 항상 마운트된 이 영역의 문구로 알림(새로 끼워 넣은 영역은 낭독되지 않을 수 있음) */}
        <p role="status" className="sr-only">
          {loading
            ? '초대 링크를 불러오는 중이에요'
            : inviteLink === undefined && onRetry
              ? '초대 링크를 불러오지 못했어요. 다시 불러오기를 눌러 주세요'
              : ''}
        </p>
        {onRetry && inviteLink === undefined ? (
          // 다시 불러오는 동안에도 버튼을 그대로 두어 키보드 초점을 잃지 않음(로딩 덮개가 누름을 막고, 끝나면 초점을 되돌림)
          <div className="bg-surface-secondary rounded-r3 px-padding-p8 py-padding-p5 gap-s3 flex items-center justify-between">
            <p className="typography-body-3-regular text-text-tertiary">
              초대 링크를 불러오지 못했어요.
            </p>
            <button
              type="button"
              aria-busy={loading || undefined}
              onClick={onRetry}
              className="typography-body-3-semibold text-text-primary focus-visible:outline-border-brand cursor-pointer underline focus-visible:outline-2 focus-visible:outline-offset-2"
            >
              다시 불러오기
            </button>
          </div>
        ) : (
          <TextField id={linkId} label={LINK_LABEL} readOnly value={inviteLink ?? ''} />
        )}
        <p className="bg-surface-secondary rounded-r3 px-padding-p8 py-padding-p5 gap-s3 typography-body-3-regular text-text-tertiary flex items-center">
          <LineAlertSmallIcon className="text-icon-tertiary shrink-0" />
          번치는 최대 8명까지 함께할 수 있어요.
        </p>
      </section>
    </PageShell>
  );
}
