import type { ComponentProps } from 'react';
import { Button, Header } from '@app/design-system';
import { COMMON_MESSAGES } from '@/shared/constants/messages';
import { HeaderBackButton } from './HeaderBackButton';
import { PageShell } from './PageShell';

type PageErrorStateProps = {
  /** 화면 제목(낭독용 h1) */
  title: string;
  /** 「다시 시도」를 눌렀을 때 */
  onRetry?: (() => void) | undefined;
  /** 있으면 헤더에 뒤로 가기를 둠(오류가 계속될 때 이 화면에서 나갈 수 있게) */
  onBack?: (() => void) | undefined;
  /** 뒤로 가기 아이콘 색(기본 primary) */
  backTone?: ComponentProps<typeof HeaderBackButton>['tone'] | undefined;
  /** 다시 받는 중(버튼은 그대로 두고 aria-busy만, 초점 유지) */
  retrying?: boolean | undefined;
};

/** 화면을 처음 불러오지 못했을 때의 화면 전체 안내와 다시 시도 버튼(Figma에 없는 상태) */
export function PageErrorState({
  title,
  onRetry,
  onBack,
  backTone = 'primary',
  retrying,
}: PageErrorStateProps) {
  return (
    <PageShell
      header={
        onBack ? (
          <Header leading={<HeaderBackButton tone={backTone} onClick={onBack} />} />
        ) : undefined
      }
    >
      <h1 className="sr-only">{title}</h1>
      <div className="gap-s8 px-s8 flex h-full flex-col items-center justify-center">
        <p role="alert" className="typography-body-3-semibold text-text-secondary text-center">
          {COMMON_MESSAGES.temporaryFailure}
        </p>
        <Button variant="tertiary" size="md" aria-busy={retrying || undefined} onClick={onRetry}>
          다시 시도
        </Button>
      </div>
    </PageShell>
  );
}
