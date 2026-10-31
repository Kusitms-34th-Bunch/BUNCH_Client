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
        <Dialog.Title>{PHOTO_BOX_MESSAGES.deleteConfirmTitle}</Dialog.Title>
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

type DateChangeConfirmDialogProps = {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
};

/**
 * 관리자가 다른 멤버 사진이나 함께 올린 사진의 날짜를 바꿀 때 거치는 확인 창(날짜 바꾸기 저장·끌어 놓기 공통)
 * 문구와 시안은 기획 확정 전이라 임시이고, 삭제 확인 창과 같은 구조(「취소」 최초 포커스)를 따름
 */
export function DateChangeConfirmDialog({
  open,
  onClose,
  onConfirm,
}: DateChangeConfirmDialogProps) {
  return (
    <Dialog.Root
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
    >
      <Dialog.Content>
        <Dialog.Title>{PHOTO_BOX_MESSAGES.dateConfirmTitle}</Dialog.Title>
        <Dialog.Description>{PHOTO_BOX_MESSAGES.dateConfirmDescription}</Dialog.Description>
        <Dialog.Footer>
          <Dialog.Confirm variant="secondary" className="min-w-0 flex-1" onClick={onConfirm}>
            바꾸기
          </Dialog.Confirm>
          <Dialog.Cancel variant="primary" className="min-w-0 flex-1">
            취소
          </Dialog.Cancel>
        </Dialog.Footer>
      </Dialog.Content>
    </Dialog.Root>
  );
}
