import { Button } from '@app/design-system';
import { PageShell } from '@/shared/components/layout/PageShell';
import { BUNDLE_MESSAGES } from '../../constants/messages';

type BundleEditErrorProps = {
  onRetry: () => void;
};

/** 수정할 번들을 불러오지 못했을 때의 안내와 다시 시도 버튼(Figma에 없는 상태) */
export function BundleEditError({ onRetry }: BundleEditErrorProps) {
  return (
    <PageShell>
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
