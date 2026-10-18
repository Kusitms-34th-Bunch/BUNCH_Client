import { Dialog } from '@app/design-system';

type ExitFlowDialogProps = {
  /** 모달 제목(예: 「번치 만들기를 그만둘까요?」) */
  title: string;
  description: string;
  /** 모달만 닫는 버튼 글자 */
  cancelLabel: string;
  open: boolean;
  onOpenChange: (_open: boolean) => void;
  onExit: () => void;
  onClosed?: () => void;
};

/**
 * 번치 만들기·참여 흐름의 헤더 뒤로 가기가 여는 중단 확인 모달(문구는 흐름이 정함)
 * 「나가기」는 `onExit`, 취소 버튼·ESC는 모달만 닫음
 * 닫힘 요청(ESC)이 나가기가 되지 않도록 `ConfirmDialog` 대신 부품을 조합함
 */
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
          <Dialog.Confirm
            variant="secondary"
            className="min-w-0 flex-1"
            disabled={!open}
            onClick={onExit}
          >
            나가기
          </Dialog.Confirm>
          <Dialog.Cancel variant="primary" className="min-w-0 flex-1" disabled={!open}>
            {cancelLabel}
          </Dialog.Cancel>
        </Dialog.Footer>
      </Dialog.Content>
    </Dialog.Root>
  );
}
