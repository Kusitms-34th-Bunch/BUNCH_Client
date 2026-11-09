import { socialLoginResultSchema } from '@app/bridge';
import { isNativeShell, loginBridge } from '@/shared/bridge/client';
import type { SignIn } from '../hooks/useSocialLogin';
import { loginWithSocial } from '../api/login';

/**
 * 네이티브 쉘의 소셜 SDK로 받은 ID 토큰을 BFF 로그인으로 넘기는 `signIn` 구현
 * 로그인 창을 닫으면 `cancelled`, 그 밖의 실패(쉘 밖·이전 쉘·SDK·검증·서버 오류)는 던져 호출부가 실패로 처리
 * 토큰·nonce는 저장·기록하지 않고 곧바로 BFF로만 보냄(오류 메시지에도 넣지 않음)
 */
export const signInWithSocial: SignIn = async (provider) => {
  if (!isNativeShell() || !loginBridge.isNativeMethodAvailable('socialLogin')) {
    throw new Error('앱에서만 소셜 로그인을 할 수 있어요.');
  }

  const result = socialLoginResultSchema.parse(await loginBridge.socialLogin(provider));
  if (result.status === 'cancelled') return 'cancelled';
  if (result.provider !== provider) {
    throw new Error('요청한 소셜 서비스와 다른 로그인 결과가 왔어요.');
  }

  await loginWithSocial({
    provider: result.provider,
    idToken: result.idToken,
    nonce: result.nonce,
  });
  return 'success';
};
