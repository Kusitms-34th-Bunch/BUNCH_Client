'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ONBOARDING_PATHS } from '../constants/paths';
import { useCreateBunchDraft, type CreateBunchDraft } from '../contexts/createBunchDraftContext';

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

// 클라이언트 draft로 첫 진입 시에만 검사해 완료·중단 시 초기화에 따른 재이동 방지
// 완료 기록이 있으면 입력값이 없어도 완료 화면 진입 허용
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
