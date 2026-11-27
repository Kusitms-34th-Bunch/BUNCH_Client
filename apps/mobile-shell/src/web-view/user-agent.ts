import { STAGING_SHELL_USER_AGENT } from '@app/bridge';

/**
 * WebView User-Agent 끝에 붙일 이름. TestFlight 테스터용 빌드(`EXPO_PUBLIC_API_ENV=staging`)만 개발 서버 표시(#581)
 * 그 밖의 빌드(심사·출시·개발)는 붙이지 않아 웹이 운영 설정을 씀
 */
export const shellUserAgentName = (apiEnv: string | undefined) =>
  apiEnv === 'staging' ? STAGING_SHELL_USER_AGENT : undefined;
