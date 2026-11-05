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
      <Dialog.Content>
        <Dialog.Title>{title}</Dialog.Title>
        <Dialog.Description>{description}</Dialog.Description>
        <Dialog.Footer>
          {/* 동일한 버튼 폭에서 「계속 참여하기」가 잘리지 않도록 좌우 여백 축소 */}
          <Dialog.Confirm variant="secondary" className="px-s6" disabled={!open} onClick={onExit}>
            나가기
          </Dialog.Confirm>
          <Dialog.Cancel variant="primary" className="px-s6" disabled={!open}>
            {cancelLabel}
          </Dialog.Cancel>
        </Dialog.Footer>
      </Dialog.Content>
    </Dialog.Root>
  );
}
