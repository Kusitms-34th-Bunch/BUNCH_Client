import { socialLoginResultSchema, socialProviderSchema, type SocialLoginResult } from '@app/bridge';
import { initializeKakaoSDK } from '@react-native-kakao/core';
import { login } from '@react-native-kakao/user';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as Crypto from 'expo-crypto';
import { createAppleLogin, createGoogleLogin, createKakaoLogin } from './social-login-core';

// `process.env.EXPO_PUBLIC_*` 직접 접근 유지(Metro는 이렇게 쓴 곳만 번들에 포함)
const kakaoLogin = createKakaoLogin({
  appKey: process.env.EXPO_PUBLIC_KAKAO_NATIVE_APP_KEY,
  initialize: initializeKakaoSDK,
  login: (options) => login(options),
  randomNonce: () => Crypto.randomUUID(),
});

const googleLogin = createGoogleLogin({
  iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
  webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
  configure: (options) => GoogleSignin.configure(options),
  signIn: async () => {
    const result = await GoogleSignin.signIn();
    return result.type === 'success'
      ? { type: 'success', data: { idToken: result.data.idToken } }
      : { type: 'cancelled' };
  },
});

const appleLogin = createAppleLogin({
  isAvailable: () => AppleAuthentication.isAvailableAsync(),
  signIn: ({ nonce }) => AppleAuthentication.signInAsync({ nonce }),
  randomNonce: () => Crypto.randomUUID(),
  sha256Hex: async (value) =>
    (
      await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, value, {
        encoding: Crypto.CryptoEncoding.HEX,
      })
    ).toLowerCase(),
});

/**
 * bridge `socialLogin`의 쉘 구현: 네이티브 SDK로 로그인하고 서버 로그인에 쓸 ID 토큰(·nonce)을 돌려줌
 * 사용자가 로그인 창을 닫으면 `cancelled`, SDK 오류는 토큰이 없는 일반 문구로 던짐
 */
export async function socialLogin(provider: unknown): Promise<SocialLoginResult> {
  const parsed = socialProviderSchema.parse(provider);
  if (parsed === 'kakao') return socialLoginResultSchema.parse(await kakaoLogin());
  if (parsed === 'google') return socialLoginResultSchema.parse(await googleLogin());
  return socialLoginResultSchema.parse(await appleLogin());
}
