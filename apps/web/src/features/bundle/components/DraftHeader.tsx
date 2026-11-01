import { cn, Header, LineChevronLeftLargeIcon, TextButton } from '@app/design-system';
import { ErrorBanner } from '@app/design-system/web';
import { HeaderIconButton } from '@/shared/components/layout/HeaderIconButton';
import type { SaveStatus } from '../lib/types';
import { BUNDLE_MESSAGES } from '../constants/messages';
import { SaveStatusText } from './SaveStatusText';

type DraftHeaderProps = {
  saveStatus: SaveStatus;
  /** 업로드할 수 있는 상태(권한·필수 항목·저장·연결이 모두 충족) */
  uploadReady: boolean;
  /** 연결 끊김 배너를 보일지 */
  offline: boolean;
  onBack: () => void;
  /** 「업로드」를 눌렀을 때(활성 여부와 관계없이 호출, 안내는 호출하는 쪽이 정함) */
  onUpload: () => void;
  onRetry: () => void;
};

/**
 * 상단 고정 영역: 뒤로가기·저장 상태·「업로드」와 연결 끊김 배너
 * 「업로드」는 조건을 못 채우면 `aria-disabled`로 흐리게 두고 눌렀을 때 이유를 안내(포커스·클릭 유지)
 */
export function DraftHeader({
  saveStatus,
  uploadReady,
  offline,
  onBack,
  onUpload,
  onRetry,
}: DraftHeaderProps) {
  return (
    <>
      <Header
        leading={
          <HeaderIconButton label="뒤로 가기" onClick={onBack}>
            <LineChevronLeftLargeIcon aria-hidden="true" />
          </HeaderIconButton>
        }
        title={<SaveStatusText status={saveStatus} />}
        trailing={
          <TextButton
            size="sm"
            variant="primary"
            aria-disabled={uploadReady ? undefined : true}
            className={cn(!uploadReady && 'text-text-disabled cursor-not-allowed')}
            onClick={onUpload}
          >
            {BUNDLE_MESSAGES.upload}
          </TextButton>
        }
      />
      {offline && (
        <ErrorBanner actionLabel={BUNDLE_MESSAGES.offlineRetry} onActionClick={onRetry}>
          {BUNDLE_MESSAGES.offlineBanner}
        </ErrorBanner>
      )}
    </>
  );
}
