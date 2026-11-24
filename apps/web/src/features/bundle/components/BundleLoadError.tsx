import { PageErrorState } from '@/shared/components/layout/PageErrorState';

type BundleLoadErrorProps = {
  /** 「다시 시도」를 눌렀을 때 */
  onRetry?: (() => void) | undefined;
};

/** 번들 화면들의 첫 불러오기 실패 안내(사진함 오류 화면과 같은 모양·제목) */
export function BundleLoadError({ onRetry }: BundleLoadErrorProps) {
  return <PageErrorState title="사진함" onRetry={onRetry} />;
}
