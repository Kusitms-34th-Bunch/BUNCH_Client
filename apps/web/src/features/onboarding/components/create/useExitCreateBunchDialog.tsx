'use client';

import { useRouter } from 'next/navigation';
import { ONBOARDING_PATHS } from '../../constants/paths';
import { useCreateBunchDraft } from '../../contexts/createBunchDraftContext';
import { useExitFlowDialog } from '../../hooks/useExitFlowDialog';

/** 번치 만들기 단계의 뒤로 가기가 여는 중단 확인 모달. 나가면 입력값을 비우고 피드로 이동 */
export function useExitCreateBunchDialog() {
  const router = useRouter();
  const { reset } = useCreateBunchDraft();

  return useExitFlowDialog({
    title: '번치 만들기를 그만둘까요?',
    description: '지금 나가면 작성한 정보가 모두 사라지고 피드로 이동해요.',
    cancelLabel: '계속 만들기',
    onExit: () => {
      reset();
      router.replace(ONBOARDING_PATHS.feed);
    },
  });
}
