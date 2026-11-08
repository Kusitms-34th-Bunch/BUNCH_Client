import { socialLoginResultSchema, socialProviderSchema, type SocialLoginResult } from '@app/bridge';
import { initializeKakaoSDK } from '@react-native-kakao/core';
import { login } from '@react-native-kakao/user';
import * as Crypto from 'expo-crypto';
import { createKakaoLogin } from './social-login-core';

// `process.env.EXPO_PUBLIC_*` 직접 접근 유지(Metro는 이렇게 쓴 곳만 번들에 포함)
const kakaoLogin = createKakaoLogin({
  appKey: process.env.EXPO_PUBLIC_KAKAO_NATIVE_APP_KEY,
  initialize: initializeKakaoSDK,
  login: (options) => login(options),
  randomNonce: () => Crypto.randomUUID(),
});

/**
 * bridge `socialLogin`의 쉘 구현: 네이티브 SDK로 로그인하고 서버 로그인에 쓸 ID 토큰·nonce를 돌려줌
 * 카카오만 연결했고 Google·Apple은 SDK 연동 전이라 실패로 돌려줌(웹은 로그인 실패 토스트를 보여줌)
 * 사용자가 로그인 창을 닫으면 `cancelled`, SDK 오류는 토큰이 없는 일반 문구로 던짐
 */
export async function socialLogin(provider: unknown): Promise<SocialLoginResult> {
  const parsed = socialProviderSchema.parse(provider);
  if (parsed !== 'kakao') throw new Error('이 소셜 로그인은 아직 지원하지 않아요.');
  return socialLoginResultSchema.parse(await kakaoLogin());
}
