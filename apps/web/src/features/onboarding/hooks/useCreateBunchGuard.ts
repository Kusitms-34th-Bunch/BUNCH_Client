'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ONBOARDING_PATHS } from '../constants/paths';
import { useCreateBunchDraft, type CreateBunchDraft } from '../contexts/createBunchDraftContext';

// 입력 순서대로 "이 단계를 마쳤는가"와 그 단계 경로
const STEPS: { path: string; done: (_draft: CreateBunchDraft) => boolean }[] = [
  {
    path: ONBOARDING_PATHS.createBunch,
    done: (draft) => draft.name.length > 0 && draft.visibility !== null,
  },
  {
    path: ONBOARDING_PATHS.createBunchDescription,
    done: (draft) => draft.description.trim().length > 0,
  },
  { path: ONBOARDING_PATHS.createBunchMood, done: (draft) => draft.mood !== null },
];

/**
 * 새로고침·URL 직접 입력으로 앞 단계를 건너뛰고 들어온 화면을 마치지 못한 첫 단계로 되돌림
 * draft는 client 상태라 서버 redirect로 막을 수 없다. 처음 그릴 때만 판정해서, 이후 draft를 비워도
 * (완료 화면의 reset, 중단 모달의 나가기) 되돌리지 않는다
 * 완료 화면은 만들기를 마쳤다는 기록(`createdName`)이 있으면 입력값이 비어 있어도 들어올 수 있다(초대 화면에서 뒤로 가기)
 * @param before 이 화면 앞에 있는 단계 수(2단계 화면은 1, 완료 화면은 3)
 * @returns 들어와도 되면 true. false인 동안은 화면을 그리지 않는다
 */
export function useCreateBunchGuard(before: number) {
  const router = useRouter();
  const draft = useCreateBunchDraft();
  const [redirectTo] = useState(() =>
    before === STEPS.length && draft.createdName !== null
      ? undefined
      : STEPS.slice(0, before).find((step) => !step.done(draft))?.path,
  );

  useEffect(() => {
    if (redirectTo) router.replace(redirectTo);
  }, [redirectTo, router]);

  return redirectTo === undefined;
}
