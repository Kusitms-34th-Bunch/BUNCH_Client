'use client';

import { useRouter } from 'next/navigation';
import { overlay } from 'overlay-kit';
import { ONBOARDING_PATHS } from '../constants/paths';
import { useCreateBunchDraft } from '../model/createBunchDraftContext';
import { ClosingGuard, ExitCreateBunchDialog } from './ExitCreateBunchDialog';

/**
 * 중단 확인 모달을 여는 함수를 돌려줌. 모달은 앱의 `OverlayProvider`가 그려서
 * `router`·`reset`은 열 때 함수에 담아 넘김(모달이 draft provider 밖에서 그려지기 때문)
 */
export function useExitCreateBunchDialog() {
  const router = useRouter();
  const { reset } = useCreateBunchDraft();

  return () =>
    overlay.open(({ isOpen, close, unmount }) => (
      <ClosingGuard isOpen={isOpen} unmount={unmount}>
        <ExitCreateBunchDialog
          open={isOpen}
          onOpenChange={(nextOpen) => {
            if (!nextOpen) close();
          }}
          onExit={() => {
            // Confirm은 스스로 닫지 않고 OverlayProvider가 피드에도 남아 있어서 직접 닫음
            close();
            router.replace(ONBOARDING_PATHS.feed);
            reset();
          }}
        />
      </ClosingGuard>
    ));
}
