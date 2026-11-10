'use client';

import { Dialog } from '@app/design-system';
import type { ScreenOverlayProps } from '@/shared/hooks/useScreenOverlay';
import { BUNDLE_MESSAGES } from '../../constants/messages';

type LeaveDraftDialogProps = ScreenOverlayProps & {
  /** 「나가기」를 눌렀을 때 */
  onConfirm: () => void;
  /** 번들을 만든 멤버가 나가는 경우(번들이 삭제된다는 문구) */
  creator?: boolean | undefined;
};

/**
 * 번들 나가기 확인 창(작성 화면 헤더 더보기의 「번들 나가기」·참여 멤버 관리 화면의 내 카드 X가 같이 씀)
 * 초안 생성자는 번들이 삭제된다는 문구를 보고, 되돌릴 수 없는 동작이라 최초 포커스는 「취소」(Dialog 기본)에 두며 바깥 누름은 무시
 */
export function LeaveDraftDialog({
  onConfirm,
  creator = false,
  ...rootProps
}: LeaveDraftDialogProps) {
  return (
    <Dialog.Root {...rootProps}>
      <Dialog.Content>
        <Dialog.Title>
          {creator ? BUNDLE_MESSAGES.leaveCreatorTitle : BUNDLE_MESSAGES.leaveConfirmTitle}
        </Dialog.Title>
        <Dialog.Description className="whitespace-pre-line">
          {creator
            ? BUNDLE_MESSAGES.leaveCreatorDescription
            : BUNDLE_MESSAGES.leaveConfirmDescription}
        </Dialog.Description>
        <Dialog.Footer>
          <Dialog.Confirm variant="warning" onClick={onConfirm}>
            {BUNDLE_MESSAGES.leave}
          </Dialog.Confirm>
          <Dialog.Cancel variant="secondary">{BUNDLE_MESSAGES.cancel}</Dialog.Cancel>
        </Dialog.Footer>
      </Dialog.Content>
    </Dialog.Root>
  );
}
