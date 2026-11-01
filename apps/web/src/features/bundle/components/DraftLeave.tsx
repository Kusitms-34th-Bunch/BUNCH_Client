'use client';

import { Dialog, TextButton } from '@app/design-system';
import { useState } from 'react';
import { BUNDLE_MESSAGES } from '../constants/messages';

type DraftLeaveProps = {
  /** 확인하면 작성 화면을 나감 */
  onLeave: () => void;
};

/**
 * 맨 아래 「나가기」: 누르면 확인 창(Figma Dialog `2082:49691`)을 열고, 「나가기」(왼쪽, 경고색)를 눌러야 나감
 * 되돌릴 수 없는 동작이라 최초 포커스는 「취소」(Dialog 기본)에 두고, 바깥 누름은 무시
 */
export function DraftLeave({ onLeave }: DraftLeaveProps) {
  const [open, setOpen] = useState(false);

  return (
    <section className="pt-s18 flex flex-col items-center">
      <p className="typography-caption-1-regular text-text-quinary">
        {BUNDLE_MESSAGES.leaveQuestion}
      </p>
      <TextButton size="sm" variant="warning" onClick={() => setOpen(true)}>
        {BUNDLE_MESSAGES.leave}
      </TextButton>
      <Dialog.Root open={open} onOpenChange={setOpen}>
        <Dialog.Content>
          <Dialog.Title>{BUNDLE_MESSAGES.leaveConfirmTitle}</Dialog.Title>
          <Dialog.Description>{BUNDLE_MESSAGES.leaveConfirmDescription}</Dialog.Description>
          <Dialog.Footer>
            <Dialog.Confirm variant="warning" className="min-w-0 flex-1" onClick={onLeave}>
              {BUNDLE_MESSAGES.leave}
            </Dialog.Confirm>
            <Dialog.Cancel variant="secondary" className="min-w-0 flex-1">
              취소
            </Dialog.Cancel>
          </Dialog.Footer>
        </Dialog.Content>
      </Dialog.Root>
    </section>
  );
}
