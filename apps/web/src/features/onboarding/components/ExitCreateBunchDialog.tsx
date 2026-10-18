'use client';

import { Dialog } from '@app/design-system';
import { useEffect, useRef, type ReactNode } from 'react';

type ExitCreateBunchDialogProps = {
  open: boolean;
  onOpenChange: (_open: boolean) => void;
  onExit: () => void;
};

/**
 * 번치 만들기 단계의 헤더 뒤로 가기가 여는 중단 확인 모달
 * 「나가기」는 `onExit`, 「계속 만들기」·ESC는 모달만 닫음
 * 닫힘 요청(ESC)이 나가기가 되지 않도록 `ConfirmDialog` 대신 부품을 조합함
 */
export function ExitCreateBunchDialog({ open, onOpenChange, onExit }: ExitCreateBunchDialogProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Content>
        <Dialog.Title>번치 만들기를 그만둘까요?</Dialog.Title>
        <Dialog.Description>
          지금 나가면 작성한 정보가 모두 사라지고 피드로 이동해요.
        </Dialog.Description>
        <Dialog.Footer>
          <Dialog.Confirm variant="secondary" className="min-w-0 flex-1" onClick={onExit}>
            나가기
          </Dialog.Confirm>
          <Dialog.Cancel variant="primary" className="min-w-0 flex-1">
            계속 만들기
          </Dialog.Cancel>
        </Dialog.Footer>
      </Dialog.Content>
    </Dialog.Root>
  );
}

/** 닫힌 모달은 한 번 더 그린 뒤(초점 복원 등) 비움. 닫힘 애니메이션이 생기면 끝난 뒤로 옮김 */
export function ClosingGuard({
  isOpen,
  unmount,
  children,
}: {
  isOpen: boolean;
  unmount: () => void;
  children: ReactNode;
}) {
  // overlay-kit은 처음에 isOpen=false로 그린 뒤 true로 바꾸므로, 한 번 열린 뒤 닫혔을 때만 비움
  const wasOpen = useRef(false);
  useEffect(() => {
    if (isOpen) wasOpen.current = true;
    else if (wasOpen.current) unmount();
  }, [isOpen, unmount]);
  return children;
}
