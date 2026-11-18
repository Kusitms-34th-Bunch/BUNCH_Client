import { Button, Header, LineChevronLeftLargeIcon } from '@app/design-system';
import { HeaderIconButton } from '@/shared/components/layout/HeaderIconButton';
import { PageShell } from '@/shared/components/layout/PageShell';

type PhotoBoxErrorProps = {
  /** 「다시 시도」를 눌렀을 때(첫 목록 다시 받기) */
  onRetry?: (() => void) | undefined;
  /** 있으면 헤더에 뒤로 가기를 둠(오류가 계속될 때 이 화면에서 나갈 수 있게) */
  onBack?: (() => void) | undefined;
};

/** 첫 목록을 불러오지 못했을 때의 안내와 다시 시도 버튼(Figma에 없는 상태) */
export function PhotoBoxError({ onRetry, onBack }: PhotoBoxErrorProps) {
  return (
    <PageShell
      header={
        onBack ? (
          <Header
            leading={
              <HeaderIconButton label="뒤로 가기" onClick={onBack}>
                <LineChevronLeftLargeIcon aria-hidden="true" />
              </HeaderIconButton>
            }
          />
        ) : undefined
      }
    >
      <h1 className="sr-only">사진함</h1>
      <div className="gap-s8 px-s8 flex h-full flex-col items-center justify-center">
        <p role="alert" className="typography-body-3-semibold text-text-secondary text-center">
          일시적인 오류가 발생했어요. 다시 시도해 주세요
        </p>
        <Button variant="tertiary" size="md" onClick={onRetry}>
          다시 시도
        </Button>
      </div>
    </PageShell>
  );
}
