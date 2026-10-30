import { Button } from '@app/design-system';
import { PageShell } from '@/shared/components/layout/PageShell';

type PhotoBoxErrorProps = {
  /** 「다시 시도」를 눌렀을 때(목록 API 연결 전에는 호출 지점만) */
  onRetry?: (() => void) | undefined;
};

/** 첫 목록을 불러오지 못했을 때의 안내와 다시 시도 버튼(Figma에 없는 상태) */
export function PhotoBoxError({ onRetry }: PhotoBoxErrorProps) {
  return (
    <PageShell>
      <h1 className="sr-only">사진함</h1>
      <div className="gap-s8 px-s8 flex h-full flex-col items-center justify-center">
        <p role="alert" className="typography-body-2-meduim text-text-secondary text-center">
          일시적인 오류가 발생했어요. 다시 시도해 주세요
        </p>
        <Button variant="tertiary" size="md" onClick={onRetry}>
          다시 시도
        </Button>
      </div>
    </PageShell>
  );
}
