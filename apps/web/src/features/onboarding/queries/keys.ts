// 응답을 바꾸는 입력은 모두 key에 포함(docs/architecture/data-layer.md)
export const onboardingKeys = {
  all: ['onboarding'] as const,
  // 응답을 바꾸는 입력은 번치 하나뿐
  invitation: (bunchId: string | undefined) =>
    [...onboardingKeys.all, 'invitation', bunchId] as const,
};
