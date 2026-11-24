import { PageErrorState } from '@/shared/components/layout/PageErrorState';

type PhotoBoxErrorProps = {
  /** 「다시 시도」를 눌렀을 때(첫 목록 다시 받기) */
  onRetry?: (() => void) | undefined;
  /** 있으면 헤더에 뒤로 가기를 둠 */
  onBack?: (() => void) | undefined;
};

/** 사진함 첫 목록을 불러오지 못했을 때 */
export function PhotoBoxError({ onRetry, onBack }: PhotoBoxErrorProps) {
  return <PageErrorState title="사진함" onRetry={onRetry} onBack={onBack} />;
}
