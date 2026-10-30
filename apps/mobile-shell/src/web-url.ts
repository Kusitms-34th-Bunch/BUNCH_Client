export function resolveWebUrl(isDevelopment: boolean, localUrl?: string, productionUrl?: string) {
  const name = isDevelopment ? 'EXPO_PUBLIC_DEV_WEB_URL' : 'EXPO_PUBLIC_WEB_URL';
  const value = (isDevelopment ? localUrl : productionUrl)?.trim();
  if (!value) throw new Error(`${name}이 설정되지 않았다. 앱 환경변수를 확인한다.`);

  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error(`${name}이 올바른 URL이 아니다.`);
  }
  if (isDevelopment ? !['http:', 'https:'].includes(url.protocol) : url.protocol !== 'https:') {
    throw new Error(`${name}은 ${isDevelopment ? 'HTTP 또는 HTTPS' : 'HTTPS'} 주소여야 한다.`);
  }
  return value;
}

export function isAppWebUrl(value: string, appUrl: string) {
  try {
    const url = new URL(value);
    return ['http:', 'https:'].includes(url.protocol) && url.origin === new URL(appUrl).origin;
  } catch {
    return false;
  }
}
