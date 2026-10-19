import { Dialog } from '@app/design-system';

type ExitFlowDialogProps = {
  title: string;
  description: string;
  /** 모달만 닫는 버튼 글자 */
  cancelLabel: string;
  open: boolean;
  onOpenChange: (_open: boolean) => void;
  onExit: () => void;
  onClosed?: () => void;
};

// ESC 닫힘과 나가기 동작을 구분하기 위해 ConfirmDialog 대신 부품 조합
export function ExitFlowDialog({
  title,
  description,
  cancelLabel,
  open,
  onOpenChange,
  onExit,
  onClosed,
}: ExitFlowDialogProps) {
  return (
    <Dialog.Root
      open={open}
      onOpenChange={onOpenChange}
      onOpenChangeComplete={(nextOpen) => {
        if (!nextOpen) onClosed?.();
      }}
    >
      <Dialog.Content
        className="transition-[scale,opacity] duration-200 ease-[cubic-bezier(0.03,0.4,0.1,1)] data-ending-style:opacity-0 data-ending-style:duration-100 data-ending-style:ease-[cubic-bezier(0.35,0,1,1)] data-starting-style:scale-130 data-starting-style:opacity-0 motion-reduce:transition-none"
        backdropClassName="transition-opacity duration-100 ease-[cubic-bezier(0,0,0.15,1)] data-starting-style:opacity-0 data-ending-style:opacity-0 data-ending-style:duration-100 data-ending-style:ease-[cubic-bezier(0.35,0,1,1)] motion-reduce:transition-none"
      >
        <Dialog.Title>{title}</Dialog.Title>
        <Dialog.Description>{description}</Dialog.Description>
        <Dialog.Footer>
          {/* 동일한 버튼 폭에서 「계속 참여하기」가 잘리지 않도록 좌우 여백 축소 */}
          <Dialog.Confirm
            variant="secondary"
            className="px-s6 min-w-0 flex-1"
            disabled={!open}
            onClick={onExit}
          >
            나가기
          </Dialog.Confirm>
          <Dialog.Cancel variant="primary" className="px-s6 min-w-0 flex-1" disabled={!open}>
            {cancelLabel}
          </Dialog.Cancel>
        </Dialog.Footer>
      </Dialog.Content>
    </Dialog.Root>
  );
}
