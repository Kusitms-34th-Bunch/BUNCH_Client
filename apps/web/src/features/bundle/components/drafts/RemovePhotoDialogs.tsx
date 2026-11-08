'use client';

import { ConfirmDialog, Dialog } from '@app/design-system';
import type { RemovePhotoKind } from '../../lib/photos';
import { BUNDLE_MESSAGES } from '../../constants/messages';

type RemovePhotoDialogsProps = {
  /** 열려 있는 확인 창. 닫힘은 undefined */
  kind: RemovePhotoKind | undefined;
  onClose: () => void;
  /** 「삭제하기」로 확정했을 때 */
  onConfirm: () => void;
};

/**
 * 사진 빼기 확인 창(캡션 화면 X와 크게 보기 ⋯ 「삭제」가 같이 씀, 기능 spec 4.3.5)
 * 마지막 한 장이면 「확인」만 있는 안내 창(Figma `2082:49108`), 아니면 항상 삭제 확인 창(Figma `4850:62115`, 캡션 유무와 상관없음)
 */
export function RemovePhotoDialogs({ kind, onClose, onConfirm }: RemovePhotoDialogsProps) {
  return (
    <>
      <ConfirmDialog
        open={kind === 'last'}
        onOpenChange={(open) => {
          if (!open) onClose();
        }}
        appearance="text"
        title={BUNDLE_MESSAGES.removePhotoBlockedTitle}
        description={BUNDLE_MESSAGES.removePhotoBlockedDescription}
        confirmLabel={BUNDLE_MESSAGES.removePhotoBlockedConfirm}
        onConfirm={onClose}
      />
      <Dialog.Root
        open={kind === 'confirm'}
        onOpenChange={(open) => {
          if (!open) onClose();
        }}
      >
        <Dialog.Content>
          <Dialog.Title>{BUNDLE_MESSAGES.removeConfirmTitle}</Dialog.Title>
          <Dialog.Description>{BUNDLE_MESSAGES.removeConfirmDescription}</Dialog.Description>
          <Dialog.Footer>
            <Dialog.Confirm variant="warning" onClick={onConfirm}>
              {BUNDLE_MESSAGES.removeConfirmConfirm}
            </Dialog.Confirm>
            <Dialog.Cancel variant="secondary">{BUNDLE_MESSAGES.cancel}</Dialog.Cancel>
          </Dialog.Footer>
        </Dialog.Content>
      </Dialog.Root>
    </>
  );
}
