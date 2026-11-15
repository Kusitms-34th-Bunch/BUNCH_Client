'use client';

import { Dialog } from '@app/design-system';
import { Fragment } from 'react';
import type { ScreenOverlayProps } from '@/shared/hooks/useScreenOverlay';
import type { DateConfirmKind } from '../lib/photoActions';
import { dateConfirmCopy, PHOTO_BOX_MESSAGES } from '../constants/messages';

type DeleteConfirmDialogProps = ScreenOverlayProps & {
  /** 고른 사진 종류에 맞는 제목과 설명 줄(`deleteConfirmCopy`) */
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
          {lines.map((line, index) => (
            <Fragment key={line}>
              {index > 0 && <br />}
              {line}
            </Fragment>
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
  /** 고른 사진 종류에 맞는 문구(`getDateConfirmKind`) */
  kind: DateConfirmKind;
  onConfirm: () => void;
};

/**
 * 관리자가 다른 멤버 사진이나 함께 올린 사진의 날짜를 바꿀 때 거치는 확인 창(날짜 바꾸기 저장·끌어 놓기 공통)
 * 문구는 명세 3.4.1 원문이고, 삭제 확인 창과 같은 구조(「취소」 최초 포커스)를 따름
 */
export function DateChangeConfirmDialog({
  kind,
  onConfirm,
  ...rootProps
}: DateChangeConfirmDialogProps) {
  const copy = dateConfirmCopy(kind);
  return (
    <Dialog.Root {...rootProps}>
      <Dialog.Content>
        <Dialog.Title>{copy.title}</Dialog.Title>
        <Dialog.Description>{copy.description}</Dialog.Description>
        <Dialog.Footer>
          <Dialog.Confirm variant="secondary" onClick={onConfirm}>
            {PHOTO_BOX_MESSAGES.dateConfirmButton}
          </Dialog.Confirm>
          <Dialog.Cancel variant="primary">취소</Dialog.Cancel>
        </Dialog.Footer>
      </Dialog.Content>
    </Dialog.Root>
  );
}
