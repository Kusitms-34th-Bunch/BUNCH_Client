import { Button } from '@app/design-system';
import { PageShell } from '@/shared/components/layout/PageShell';

type BunchHomeErrorProps = {
  /** 「다시 시도」를 눌렀을 때 */
  onRetry?: (() => void) | undefined;
};

/** 번치 홈을 처음 불러오지 못했을 때의 안내와 다시 시도 버튼(Figma에 없는 상태) */
export function BunchHomeError({ onRetry }: BunchHomeErrorProps) {
  return (
    <PageShell>
      <h1 className="sr-only">번치</h1>
      <div className="gap-s8 px-s8 flex h-full flex-col items-center justify-center">
        <p role="alert" className="typography-body-3-semi-bold text-text-secondary text-center">
          일시적인 오류가 발생했어요. 다시 시도해 주세요
        </p>
        <Button variant="tertiary" size="md" onClick={onRetry}>
          다시 시도
        </Button>
      </div>
    </PageShell>
  );
}
