'use client';

import { ConfirmDialog, Dialog } from '@app/design-system';
import { useState } from 'react';
import type { RemovePhotoKind } from '../../lib/photos';
import { BUNDLE_MESSAGES } from '../../constants/messages';

type RemovePhotoDialogsProps = {
  /** 열려 있는 확인 창. 닫힘은 undefined */
  kind: RemovePhotoKind | undefined;
  onClose: () => void;
  /** 「삭제하기」로 확정했을 때 */
  onConfirm: () => void;
  /** 멤버가 픽한 사진인지(픽도 함께 지워진다고 알림, Figma `5699:104483`) */
  picked: boolean;
};

/**
 * 사진 빼기 확인 창(작성·캡션 화면 X와 크게 보기 ⋯ 「삭제」가 같이 씀, 기능 spec 4.3.5)
 * 마지막 한 장이면 「확인」만 있는 안내 창(Figma `5664:90500`), 아니면 항상 삭제 확인 창(Figma `5664:90517`, 픽한 사진은 `5699:104483`)
 */
export function RemovePhotoDialogs({ kind, onClose, onConfirm, picked }: RemovePhotoDialogsProps) {
  // 닫히는 동안 문구가 바뀌지 않게 열려 있을 때의 값을 유지
  const [shownPicked, setShownPicked] = useState(picked);
  if (kind === 'confirm' && picked !== shownPicked) setShownPicked(picked);

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
          <Dialog.Title>
            {shownPicked ? BUNDLE_MESSAGES.removePickedTitle : BUNDLE_MESSAGES.removeConfirmTitle}
          </Dialog.Title>
          <Dialog.Description>
            {shownPicked
              ? BUNDLE_MESSAGES.removePickedDescription
              : BUNDLE_MESSAGES.removeConfirmDescription}
          </Dialog.Description>
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
