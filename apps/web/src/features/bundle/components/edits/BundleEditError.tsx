import { Button, Header, LineChevronLeftLargeIcon } from '@app/design-system';
import { HeaderIconButton } from '@/shared/components/layout/HeaderIconButton';
import { PageShell } from '@/shared/components/layout/PageShell';
import { BUNDLE_MESSAGES } from '../../constants/messages';

type BundleEditErrorProps = {
  onRetry: () => void;
  /** 오류가 계속될 때 이 화면에서 나갈 수 있게 헤더 뒤로 가기가 하는 일 */
  onBack: () => void;
};

/** 수정할 번들을 불러오지 못했을 때의 안내와 다시 시도 버튼(Figma에 없는 상태) */
export function BundleEditError({ onRetry, onBack }: BundleEditErrorProps) {
  return (
    <PageShell
      header={
        <Header
          leading={
            <HeaderIconButton label="뒤로 가기" onClick={onBack}>
              <LineChevronLeftLargeIcon aria-hidden="true" />
            </HeaderIconButton>
          }
        />
      }
    >
      <h1 className="sr-only">{BUNDLE_MESSAGES.editTitle}</h1>
      <div className="gap-s8 px-s8 flex h-full flex-col items-center justify-center">
        <p role="alert" className="typography-body-3-semibold text-text-secondary text-center">
          {BUNDLE_MESSAGES.loadFailed}
        </p>
        <Button variant="tertiary" size="md" onClick={onRetry}>
          {BUNDLE_MESSAGES.retry}
        </Button>
      </div>
    </PageShell>
  );
}
