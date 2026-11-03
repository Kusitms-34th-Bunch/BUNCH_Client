'use client';

import { ConfirmDialog, Dialog } from '@app/design-system';
import type { RemovePhotoKind } from '../../lib/photos';
import { BUNDLE_MESSAGES } from '../../constants/messages';

type RemovePhotoDialogsProps = {
  /** 열려 있는 확인 창. 바로 빼는 경우(`direct`)와 닫힘은 undefined */
  kind: Exclude<RemovePhotoKind, 'direct'> | undefined;
  onClose: () => void;
  /** 캡션이 작성된 사진을 「삭제하기」로 확정했을 때 */
  onConfirm: () => void;
};

/**
 * 사진 빼기 확인 창(캡션 화면 X와 크게 보기 ⋯ 「삭제」가 같이 씀, 기능 spec 4.3.5)
 * 마지막 한 장이면 「확인」만 있는 안내 창(Figma `2082:49108`), 캡션이 있으면 삭제 확인 창(Figma `2091:61896`)
 * 닫는 동안에도 문구가 남도록 호출하는 쪽이 `kind`를 닫힘 전환이 끝날 때까지 유지
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
        open={kind === 'captioned'}
        onOpenChange={(open) => {
          if (!open) onClose();
        }}
      >
        <Dialog.Content>
          <Dialog.Title>{BUNDLE_MESSAGES.removeCaptionedTitle}</Dialog.Title>
          <Dialog.Description>{BUNDLE_MESSAGES.removeCaptionedDescription}</Dialog.Description>
          <Dialog.Footer>
            <Dialog.Confirm variant="warning" className="min-w-0 flex-1" onClick={onConfirm}>
              {BUNDLE_MESSAGES.removeCaptionedConfirm}
            </Dialog.Confirm>
            <Dialog.Cancel variant="secondary" className="min-w-0 flex-1">
              {BUNDLE_MESSAGES.cancel}
            </Dialog.Cancel>
          </Dialog.Footer>
        </Dialog.Content>
      </Dialog.Root>
    </>
  );
}
