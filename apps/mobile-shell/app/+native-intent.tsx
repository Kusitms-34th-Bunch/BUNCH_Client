import { incomingLinkStore } from '../src/incoming-link-store';
import { isLinkDomainUrl, toInviteWebPath } from '../src/invite-link';
import { isSdkCallbackUrl } from '../src/sdk-callback-url';

/**
 * 앱을 여는 주소를 expo-router 화면으로 바꾸기 전에 거름(null이면 지금 화면 유지, 처음 실행이면 첫 화면)
 * - 소셜 로그인 복귀 주소는 SDK가 처리하므로 화면을 옮기지 않음
 * - 초대 링크(유니버셜 링크)는 앱 화면이 아니라 WebView가 열 웹 경로라 보관만 하고 화면은 그대로 둠
 * - 연결 도메인의 그 밖의 주소(잘린 초대 링크 등)도 맞는 앱 화면이 없어 화면을 옮기지 않음
 */
export function redirectSystemPath({ path }: { path: string; initial: boolean }) {
  if (isSdkCallbackUrl(path)) return null;
  const invitePath = toInviteWebPath(path);
  if (invitePath) {
    incomingLinkStore.set(invitePath);
    return null;
  }
  if (isLinkDomainUrl(path)) return null;
  return path;
}
