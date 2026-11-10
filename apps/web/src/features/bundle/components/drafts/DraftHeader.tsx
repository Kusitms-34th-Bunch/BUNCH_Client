import { Header, LineChevronLeftLargeIcon } from '@app/design-system';
import { ErrorBanner } from '@app/design-system/web';
import { HeaderIconButton } from '@/shared/components/layout/HeaderIconButton';
import type { SaveStatus } from '../../lib/types';
import { BUNDLE_MESSAGES } from '../../constants/messages';
import { DraftMenu } from './DraftMenu';
import { SaveStatusText } from './SaveStatusText';

type DraftHeaderProps = {
  saveStatus: SaveStatus;
  /** 연결 끊김 배너를 보일지 */
  offline: boolean;
  /** 「⋯」 메뉴(번들 나가기)를 보일지(참여 멤버에게만) */
  canLeave: boolean;
  onBack: () => void;
  /** 「번들 나가기」를 골랐을 때(확인 창은 호출하는 쪽이 엶) */
  onLeave: () => void;
  onRetry: () => void;
};

/**
 * 상단 고정 영역: 뒤로가기·저장 상태·「⋯」 더보기(Figma `5664:100840`)와 연결 끊김 배너
 * 「업로드」는 헤더가 아니라 화면 아래 고정 버튼으로 옮김
 */
export function DraftHeader({
  saveStatus,
  offline,
  canLeave,
  onBack,
  onLeave,
  onRetry,
}: DraftHeaderProps) {
  return (
    <>
      {/* 더보기 메뉴가 헤더 바로 아래에 뜨도록 위치 기준 */}
      <div className="relative">
        <Header
          leading={
            <HeaderIconButton label="뒤로 가기" onClick={onBack}>
              <LineChevronLeftLargeIcon aria-hidden="true" />
            </HeaderIconButton>
          }
          title={<SaveStatusText status={saveStatus} />}
          trailing={canLeave ? <DraftMenu onLeave={onLeave} /> : undefined}
        />
      </div>
      {offline && (
        <ErrorBanner actionLabel={BUNDLE_MESSAGES.offlineRetry} onActionClick={onRetry}>
          {BUNDLE_MESSAGES.offlineBanner}
        </ErrorBanner>
      )}
    </>
  );
}
