import { isSdkCallbackUrl } from '../src/sdk-callback-url';

/**
 * 앱을 여는 주소를 expo-router 화면으로 바꾸기 전에 거름
 * 소셜 로그인 복귀 주소는 SDK가 처리하므로 화면을 옮기지 않음(null이면 지금 화면 유지)
 */
export function redirectSystemPath({ path }: { path: string; initial: boolean }) {
  return isSdkCallbackUrl(path) ? null : path;
}
