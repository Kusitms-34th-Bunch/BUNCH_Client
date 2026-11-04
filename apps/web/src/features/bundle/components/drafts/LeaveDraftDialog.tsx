'use client';

import { Dialog } from '@app/design-system';
import { BUNDLE_MESSAGES } from '../../constants/messages';

type LeaveDraftDialogProps = {
  open: boolean;
  onOpenChange: (_open: boolean) => void;
  /** 「나가기」를 눌렀을 때 */
  onConfirm: () => void;
};

/**
 * 번들 나가기 확인 창(작성 화면 맨 아래 「나가기」·참여 멤버 관리 화면의 내 카드 X가 같이 씀)
 * 초안 생성자도 같은 문구를 보고, 되돌릴 수 없는 동작이라 최초 포커스는 「취소」(Dialog 기본)에 두며 바깥 누름은 무시
 */
export function LeaveDraftDialog({ open, onOpenChange, onConfirm }: LeaveDraftDialogProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Content>
        <Dialog.Title>{BUNDLE_MESSAGES.leaveConfirmTitle}</Dialog.Title>
        <Dialog.Description className="whitespace-pre-line">
          {BUNDLE_MESSAGES.leaveConfirmDescription}
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
