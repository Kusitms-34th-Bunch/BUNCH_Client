import type { ApiContract } from '@app/api-core';
import type { components } from '@app/api-core/generated';
import { z } from 'zod';
import { bffApi, requestData } from '@/shared/api/bffApi';

/** `GET /api/v1/members/me/onboarding` 응답. 로그인 뒤 어느 화면으로 보낼지 정하는 데만 씀 */
const onboardingSchema = z.object({
  memberId: z.number().int().positive(),
  signupStatus: z.enum(['IN_PROGRESS', 'COMPLETED']),
  termsAccepted: z.boolean(),
  defaultBunchId: z.number().int().positive().nullish(),
}) satisfies z.ZodType<ApiContract<components['schemas']['OnboardingResponse']>>;

export type OnboardingState = {
  /** 같은 기기에서 회원이 바뀌었는지 구분(제품 분석 익명 ID 분리) */
  memberId: number;
  signupStatus: 'IN_PROGRESS' | 'COMPLETED';
  termsAccepted: boolean;
  /** 서버가 정한 기본(마지막으로 쓴 유효한) 번치가 있는지 */
  hasDefaultBunch: boolean;
};

/** 가입 진행 상태. 실패는 `ApiError`로 던짐 */
export const getOnboarding = async (signal?: AbortSignal): Promise<OnboardingState> => {
  const onboarding = await requestData(
    bffApi.get('members/me/onboarding', { signal: signal ?? null }),
    onboardingSchema,
    'onboarding',
  );
  return {
    memberId: onboarding.memberId,
    signupStatus: onboarding.signupStatus,
    termsAccepted: onboarding.termsAccepted,
    hasDefaultBunch: onboarding.defaultBunchId != null,
  };
};
