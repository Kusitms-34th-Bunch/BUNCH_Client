import { Button, Header, LineChevronLeftLargeIcon } from '@app/design-system';
import { HeaderIconButton } from '@/shared/components/layout/HeaderIconButton';
import { PageShell } from '@/shared/components/layout/PageShell';

type BunchHomeErrorProps = {
  /** 「다시 시도」를 눌렀을 때 */
  onRetry?: (() => void) | undefined;
  /** 하위 화면의 뒤로 가기(있으면 헤더에 표시). 번치 탭은 탭 바로 이동하므로 없음 */
  onBack?: (() => void) | undefined;
  /** 화면 제목(낭독용 h1). 기본 「번치」 */
  title?: string | undefined;
};

/** 번치 홈을 처음 불러오지 못했을 때의 안내와 다시 시도 버튼(Figma에 없는 상태) */
export function BunchHomeError({ onRetry, onBack, title = '번치' }: BunchHomeErrorProps) {
  return (
    <PageShell
      header={
        onBack ? (
          <Header
            leading={
              <HeaderIconButton label="뒤로 가기" tone="subtle" onClick={onBack}>
                <LineChevronLeftLargeIcon />
              </HeaderIconButton>
            }
          />
        ) : undefined
      }
    >
      <h1 className="sr-only">{title}</h1>
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
