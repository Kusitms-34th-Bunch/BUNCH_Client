import type { SocialProvider } from '@app/bridge';
import { normalizeError } from '@app/api-core';
import { bffApi } from '@/shared/api/bffApi';

export type SocialLoginRequest = {
  provider: SocialProvider;
  idToken: string;
  /** 카카오·Apple은 필수, Google은 선택(BFF 입력 검증과 같은 규칙) */
  nonce?: string | undefined;
};

/**
 * 소셜 로그인. BFF가 백엔드 토큰을 httpOnly 쿠키로 저장하고 본문 없이 204로 답하므로 토큰은 웹이 다루지 않음
 * 실패는 모두 `ApiError`로 던짐
 */
export const loginWithSocial = async ({ provider, idToken, nonce }: SocialLoginRequest) => {
  try {
    await bffApi.post('auth/login', { json: { provider, idToken, ...(nonce ? { nonce } : {}) } });
  } catch (error) {
    throw normalizeError(error);
  }
};
