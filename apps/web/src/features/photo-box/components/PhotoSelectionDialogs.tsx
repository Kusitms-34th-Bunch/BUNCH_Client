'use client';

import { ConfirmDialog, Dialog } from '@app/design-system';
import { PHOTO_BOX_MESSAGES } from '../constants/messages';

type BundleConfirmDialogProps = {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
};

/** 「번들 만들기」 확인 창: 「아니요」/「예」(1~20장일 때만 열림) */
export function BundleConfirmDialog({ open, onClose, onConfirm }: BundleConfirmDialogProps) {
  return (
    <ConfirmDialog
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
      title={PHOTO_BOX_MESSAGES.bundleConfirmTitle}
      description={PHOTO_BOX_MESSAGES.bundleConfirmDescription}
      cancelLabel="아니요"
      confirmLabel="예"
      onConfirm={onConfirm}
    />
  );
}

type DeleteConfirmDialogProps = {
  open: boolean;
  /** 지울 사진 장수(제목에 표시) */
  count: number;
  /** 고른 사진 종류에 맞는 안내 문구 */
  description: string;
  onClose: () => void;
  onConfirm: () => void;
};

/**
 * 삭제 확인 창(Figma 사진함_10): 「삭제하기」(왼쪽, 보조)와 「취소」(오른쪽, 강조)
 * 되돌릴 수 없는 동작이라 최초 포커스는 「취소」(Dialog 기본)에 두고, 바깥 누름은 무시
 */
export function DeleteConfirmDialog({
  open,
  count,
  description,
  onClose,
  onConfirm,
}: DeleteConfirmDialogProps) {
  return (
    <Dialog.Root
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
    >
      <Dialog.Content>
        <Dialog.Title>{PHOTO_BOX_MESSAGES.deleteConfirmTitle(count)}</Dialog.Title>
        <Dialog.Description>{description}</Dialog.Description>
        <Dialog.Footer>
          <Dialog.Confirm variant="secondary" className="min-w-0 flex-1" onClick={onConfirm}>
            삭제하기
          </Dialog.Confirm>
          <Dialog.Cancel variant="primary" className="min-w-0 flex-1">
            취소
          </Dialog.Cancel>
        </Dialog.Footer>
      </Dialog.Content>
    </Dialog.Root>
  );
}
