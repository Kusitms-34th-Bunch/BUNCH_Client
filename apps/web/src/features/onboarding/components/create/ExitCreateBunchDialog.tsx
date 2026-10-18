'use client';

import { Dialog } from '@app/design-system';

type ExitCreateBunchDialogProps = {
  open: boolean;
  onOpenChange: (_open: boolean) => void;
  onExit: () => void;
  onClosed?: () => void;
};

/**
 * 번치 만들기 단계의 헤더 뒤로 가기가 여는 중단 확인 모달
 * 「나가기」는 `onExit`, 「계속 만들기」·ESC는 모달만 닫음
 * 닫힘 요청(ESC)이 나가기가 되지 않도록 `ConfirmDialog` 대신 부품을 조합함
 */
export function ExitCreateBunchDialog({
  open,
  onOpenChange,
  onExit,
  onClosed,
}: ExitCreateBunchDialogProps) {
  return (
    <Dialog.Root
      open={open}
      onOpenChange={onOpenChange}
      onOpenChangeComplete={(nextOpen) => {
        if (!nextOpen) onClosed?.();
      }}
    >
      <Dialog.Content
        className="transition-[scale,opacity] duration-200 ease-[cubic-bezier(0.03,0.4,0.1,1)] data-[ending-style]:opacity-0 data-[ending-style]:duration-100 data-[ending-style]:ease-[cubic-bezier(0.35,0,1,1)] data-[starting-style]:scale-130 data-[starting-style]:opacity-0 motion-reduce:transition-none"
        backdropClassName="transition-opacity duration-100 ease-[cubic-bezier(0,0,0.15,1)] data-[starting-style]:opacity-0 data-[ending-style]:opacity-0 data-[ending-style]:duration-100 data-[ending-style]:ease-[cubic-bezier(0.35,0,1,1)] motion-reduce:transition-none"
      >
        <Dialog.Title>번치 만들기를 그만둘까요?</Dialog.Title>
        <Dialog.Description>
          지금 나가면 작성한 정보가 모두 사라지고 피드로 이동해요.
        </Dialog.Description>
        <Dialog.Footer>
          <Dialog.Confirm
            variant="secondary"
            className="min-w-0 flex-1"
            disabled={!open}
            onClick={onExit}
          >
            나가기
          </Dialog.Confirm>
          <Dialog.Cancel variant="primary" className="min-w-0 flex-1" disabled={!open}>
            계속 만들기
          </Dialog.Cancel>
        </Dialog.Footer>
      </Dialog.Content>
    </Dialog.Root>
  );
}
