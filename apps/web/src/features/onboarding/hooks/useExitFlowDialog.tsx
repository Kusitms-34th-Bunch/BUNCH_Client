'use client';

import { overlay } from 'overlay-kit';
import { ExitFlowDialog } from '../components/ExitFlowDialog';

type UseExitFlowDialogOptions = {
  title: string;
  description: string;
  cancelLabel: string;
  /** 「나가기」를 누르고 닫힘 전환이 끝난 뒤 호출 */
  onExit: () => void;
};

// 모달은 흐름의 provider 밖에서 렌더링되므로 화면 상태 정리를 onExit으로 전달
export function useExitFlowDialog({
  title,
  description,
  cancelLabel,
  onExit,
}: UseExitFlowDialogOptions) {
  return () => {
    let shouldExit = false;
    return overlay.open(({ isOpen, close, unmount }) => (
      <ExitFlowDialog
        title={title}
        description={description}
        cancelLabel={cancelLabel}
        open={isOpen}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) close();
        }}
        onExit={() => {
          shouldExit = true;
          close();
        }}
        onClosed={() => {
          unmount();
          if (shouldExit) onExit();
        }}
      />
    ));
  };
}
