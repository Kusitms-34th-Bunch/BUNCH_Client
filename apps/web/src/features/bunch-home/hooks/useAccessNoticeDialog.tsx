import { ConfirmDialog } from '@app/design-system';
import { useScreenOverlay } from '@/shared/hooks/useScreenOverlay';
import type { BunchSummary } from '../lib/types';
import { BUNCH_HOME_MESSAGES } from '../constants/messages';

type AccessNoticeOptions = {
  /** 「번치 목록에서 삭제」를 누름(창은 닫힘) */
  onRemove: () => void;
  /** 창이 다 닫힌 뒤. 「번치 목록에서 삭제」로 닫았는지를 받음 */
  onClosed?: ((_removed: boolean) => void) | undefined;
};

/**
 * 삭제·내보내진 번치 안내 창(기능명세 5.2.3): 사유별 제목·설명과 「번치 목록에서 삭제」
 * 전환 목록의 접근 불가 줄, 보던 번치를 볼 수 없게 됨, 접근 불가 알림이 같은 창을 씀
 */
export function useAccessNoticeDialog() {
  const openOverlay = useScreenOverlay();
  return (
    notice: Pick<BunchSummary, 'name' | 'access'>,
    { onRemove, onClosed }: AccessNoticeOptions,
  ) => {
    let removed = false;
    // Esc는 안내만 닫고 목록에 남김, 「번치 목록에서 삭제」만 목록에서 지움
    openOverlay(
      (rootProps, close) => (
        <ConfirmDialog
          {...rootProps}
          title={BUNCH_HOME_MESSAGES.unavailableTitle(notice)}
          description={BUNCH_HOME_MESSAGES.unavailableDescription(notice)}
          appearance="text"
          confirmLabel="번치 목록에서 삭제"
          onConfirm={() => {
            onRemove();
            removed = true;
            close();
          }}
        />
      ),
      () => onClosed?.(removed),
    );
  };
}
