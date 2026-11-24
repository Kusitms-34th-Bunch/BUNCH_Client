import { PageErrorState } from '@/shared/components/layout/PageErrorState';
import { BUNDLE_MESSAGES } from '../../constants/messages';

type BundleEditErrorProps = {
  onRetry: () => void;
  /** 오류가 계속될 때 이 화면에서 나갈 수 있게 헤더 뒤로 가기가 하는 일 */
  onBack: () => void;
};

/** 수정할 번들을 불러오지 못했을 때 */
export function BundleEditError({ onRetry, onBack }: BundleEditErrorProps) {
  return <PageErrorState title={BUNDLE_MESSAGES.editTitle} onRetry={onRetry} onBack={onBack} />;
}
