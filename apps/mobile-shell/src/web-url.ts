// E2E(Maestro) 빌드가 같은 기기에 띄운 웹만 열 수 있게 허용하는 주소(다른 http 주소는 E2E 빌드도 거절)
// 앱 런타임의 URL 해석이 표준과 달라(`http://evil.com?@127.0.0.1`을 루프백으로 읽음) 문자열 전체로 판정
const LOOPBACK_HTTP = /^http:\/\/(localhost|127\.0\.0\.1)(:\d{1,5})?(\/[^?#@]*)?$/;

/**
 * @param e2eBuild E2E 전용 Release 빌드(`EXPO_PUBLIC_E2E=1`, CI·로컬 스모크만). 이때만 운영 주소로 루프백 http를 받음
 *   스토어 빌드는 이 값이 없어 HTTPS만 받음(결정 기록 029)
 */
export function resolveWebUrl(
  isDevelopment: boolean,
  localUrl?: string,
  productionUrl?: string,
  e2eBuild = false,
) {
  const name = isDevelopment ? 'EXPO_PUBLIC_DEV_WEB_URL' : 'EXPO_PUBLIC_WEB_URL';
  const value = (isDevelopment ? localUrl : productionUrl)?.trim();
  if (!value) throw new Error(`${name}이 설정되지 않았다. 앱 환경변수를 확인한다.`);

  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error(`${name}이 올바른 URL이 아니다.`);
  }
  const loopbackHttp = e2eBuild && LOOPBACK_HTTP.test(value);
  if (
    isDevelopment
      ? !['http:', 'https:'].includes(url.protocol)
      : url.protocol !== 'https:' && !loopbackHttp
  ) {
    throw new Error(`${name}은 ${isDevelopment ? 'HTTP 또는 HTTPS' : 'HTTPS'} 주소여야 한다.`);
  }
  return value;
}

// 로그인 전 첫 화면(웹 `LOGIN_PATH`·`INTRO_PATH`). 앞 기록이 로그인한 사용자 화면이라 뒤로 가면 가드가 다시 여기로 보내 반복됨
const NO_BACK_PATHS = new Set(['/login', '/intro']);

/** 뒤로 가기(iOS 스와이프·Android 뒤로 버튼)로 웹 기록을 되돌리지 않을 앱 화면인지 */
export function blocksBackNavigation(value: string, appUrl: string) {
  return isAppWebUrl(value, appUrl) && NO_BACK_PATHS.has(new URL(value).pathname);
}

export function isAppWebUrl(value: string, appUrl: string) {
  try {
    const url = new URL(value);
    return ['http:', 'https:'].includes(url.protocol) && url.origin === new URL(appUrl).origin;
  } catch {
    return false;
  }
}
