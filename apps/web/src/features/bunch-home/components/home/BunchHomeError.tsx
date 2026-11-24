import { PageErrorState } from '@/shared/components/layout/PageErrorState';

type BunchHomeErrorProps = {
  /** 「다시 시도」를 눌렀을 때 */
  onRetry?: (() => void) | undefined;
  /** 하위 화면의 뒤로 가기(있으면 헤더에 표시). 번치 탭은 탭 바로 이동하므로 없음 */
  onBack?: (() => void) | undefined;
  /** 화면 제목(낭독용 h1). 기본 「번치」 */
  title?: string | undefined;
};

/** 번치 홈·하위 화면을 처음 불러오지 못했을 때(뒤로 가기는 연한 회색) */
export function BunchHomeError({ onRetry, onBack, title = '번치' }: BunchHomeErrorProps) {
  return <PageErrorState title={title} onRetry={onRetry} onBack={onBack} backTone="subtle" />;
}
