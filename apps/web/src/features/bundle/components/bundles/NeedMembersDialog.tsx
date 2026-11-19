import { ConfirmDialog } from '@app/design-system';
import type { ScreenOverlayProps } from '@/shared/hooks/useScreenOverlay';
import { BUNDLE_SELECT_MESSAGES } from '../../constants/selectMessages';

type NeedMembersDialogProps = ScreenOverlayProps & {
  /** 「초대하기」: 창을 닫고 멤버 초대 화면으로 */
  onInvite: () => void;
};

/**
 * 번치에 나 혼자라 번들을 만들 수 없을 때의 안내 창(기능명세 4.1.1 상세 동작 1, 4.1.4 예외 처리)
 * 「취소」·바깥 누름은 창만 닫음
 */
export function NeedMembersDialog({ onInvite, ...rootProps }: NeedMembersDialogProps) {
  return (
    <ConfirmDialog
      {...rootProps}
      title={BUNDLE_SELECT_MESSAGES.needMembersTitle}
      description={BUNDLE_SELECT_MESSAGES.needMembersDescription}
      confirmLabel={BUNDLE_SELECT_MESSAGES.needMembersInvite}
      cancelLabel={BUNDLE_SELECT_MESSAGES.needMembersCancel}
      onConfirm={onInvite}
    />
  );
}
