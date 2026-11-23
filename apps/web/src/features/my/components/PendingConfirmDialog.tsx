'use client';

import { ConfirmDialog } from '@app/design-system';
import { useState } from 'react';
import type { ScreenOverlayProps } from '@/shared/hooks/overlay/useScreenOverlay';

type PendingConfirmDialogProps = ScreenOverlayProps & {
  title: string;
  description?: string;
  cancelLabel: string;
  confirmLabel: string;
  /** 요청 시작. 실패하거나 취소되면(Apple 재인증 창 닫기 등) `close`를 불러 창만 닫음(성공 뒤 이동은 mutation이 처리) */
  run: (_close: () => void) => void;
};

/** 요청 중에는 취소·ESC로 닫지 않고 다시 누르지 못하는 확인 창(닫힌 뒤 요청이 끝나 화면이 바뀌는 혼란 방지) */
export function PendingConfirmDialog({ run, ...props }: PendingConfirmDialogProps) {
  const [pending, setPending] = useState(false);
  return (
    <ConfirmDialog
      {...props}
      onOpenChange={(open) => {
        if (!pending) props.onOpenChange(open);
      }}
      confirmDisabled={pending}
      onConfirm={() => {
        setPending(true);
        run(() => {
          setPending(false);
          props.onOpenChange(false);
        });
      }}
    />
  );
}
