import { socialProviderSchema, type SocialLoginResult } from '@app/bridge';

/**
 * bridge `socialLogin`의 쉘 구현 자리
 * 카카오·Google·Apple SDK 연동 전이라 항상 실패로 돌려줌(웹은 로그인 실패 토스트를 보여줌)
 */
export async function socialLogin(provider: unknown): Promise<SocialLoginResult> {
  socialProviderSchema.parse(provider);
  throw new Error('소셜 로그인 SDK가 아직 연결되지 않았어요.');
}
