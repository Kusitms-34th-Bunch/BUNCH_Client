'use client';

import { TextButton } from '@app/design-system';
import { useState } from 'react';
import { BUNDLE_MESSAGES } from '../constants/messages';
import { LeaveDraftDialog } from './LeaveDraftDialog';

type DraftLeaveProps = {
  /** 확인하면 작성 화면을 나감 */
  onLeave: () => void;
};

/** 맨 아래 「나가기」: 누르면 나가기 확인 창(Figma Dialog `2082:49691`)을 열고, 「나가기」를 눌러야 나감 */
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
      <LeaveDraftDialog open={open} onOpenChange={setOpen} onConfirm={onLeave} />
    </section>
  );
}
