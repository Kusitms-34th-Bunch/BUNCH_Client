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

/**
 * 중단 확인 모달을 여는 함수를 돌려줌. 모달은 앱의 `OverlayProvider`가 그려서
 * 화면의 router·상태 정리는 열 때 `onExit`에 담아 넘김(모달이 흐름의 provider 밖에서 그려지기 때문)
 */
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
