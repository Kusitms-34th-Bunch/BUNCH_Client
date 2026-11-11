'use client';

import { ConfirmDialog, Dialog } from '@app/design-system';
import type { ScreenOverlayProps } from '@/shared/hooks/useScreenOverlay';
import type { DateConfirmKind } from '../lib/photoActions';
import { PHOTO_BOX_MESSAGES } from '../constants/messages';

type BundleConfirmDialogProps = ScreenOverlayProps & {
  onConfirm: () => void;
};

/** 「번들 만들기」 확인 창: 「아니요」/「예」(1~20장일 때만 열림) */
export function BundleConfirmDialog(props: BundleConfirmDialogProps) {
  return (
    <ConfirmDialog
      {...props}
      title={PHOTO_BOX_MESSAGES.bundleConfirmTitle}
      description={PHOTO_BOX_MESSAGES.bundleConfirmDescription}
      cancelLabel="아니요"
      confirmLabel="예"
    />
  );
}

type DeleteConfirmDialogProps = ScreenOverlayProps & {
  /** 고른 사진 종류에 맞는 제목과 내용(내용은 한 줄씩 나눠 보여 줌) */
  title: string;
  lines: readonly string[];
  onConfirm: () => void;
};

/**
 * 삭제 확인 창(Figma 사진함_10): 「삭제하기」(왼쪽, 보조)와 「취소」(오른쪽, 강조)
 * 되돌릴 수 없는 동작이라 최초 포커스는 「취소」(Dialog 기본)에 두고, 바깥 누름은 무시
 */
export function DeleteConfirmDialog({
  title,
  lines,
  onConfirm,
  ...rootProps
}: DeleteConfirmDialogProps) {
  return (
    <Dialog.Root {...rootProps}>
      <Dialog.Content>
        <Dialog.Title>{title}</Dialog.Title>
        <Dialog.Description>
          {lines.map((line) => (
            <span key={line} className="block">
              {line}
            </span>
          ))}
        </Dialog.Description>
        <Dialog.Footer>
          <Dialog.Confirm variant="secondary" onClick={onConfirm}>
            삭제하기
          </Dialog.Confirm>
          <Dialog.Cancel variant="primary">취소</Dialog.Cancel>
        </Dialog.Footer>
      </Dialog.Content>
    </Dialog.Root>
  );
}

type DateChangeConfirmDialogProps = ScreenOverlayProps & {
  /** 고른 사진 종류(다른 멤버 사진만 / 함께 올린 사진이나 내 사진이 섞임) */
  kind: DateConfirmKind;
  onConfirm: () => void;
};

/**
 * 관리자가 다른 멤버 사진이나 함께 올린 사진의 날짜를 바꿀 때 거치는 확인 창(날짜 바꾸기 저장·끌어 놓기 공통, 기능명세서 3.4.1)
 * 「변경하기」/「취소」. 삭제 확인 창과 같은 구조(「취소」 최초 포커스)를 따름
 */
export function DateChangeConfirmDialog({
  kind,
  onConfirm,
  ...rootProps
}: DateChangeConfirmDialogProps) {
  const { title, description } = PHOTO_BOX_MESSAGES.dateConfirm(kind);
  return (
    <Dialog.Root {...rootProps}>
      <Dialog.Content>
        <Dialog.Title>{title}</Dialog.Title>
        <Dialog.Description>{description}</Dialog.Description>
        <Dialog.Footer>
          <Dialog.Confirm variant="secondary" onClick={onConfirm}>
            변경하기
          </Dialog.Confirm>
          <Dialog.Cancel variant="primary">취소</Dialog.Cancel>
        </Dialog.Footer>
      </Dialog.Content>
    </Dialog.Root>
  );
}
