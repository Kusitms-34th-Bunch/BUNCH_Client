import { resolveWebUrl } from '../web-url';

// `process.env.EXPO_PUBLIC_*` 직접 접근 유지(Metro는 이렇게 쓴 곳만 번들에 포함)
export const WEB_URL = resolveWebUrl(
  __DEV__,
  // Release 번들에 개발 주소 인라인 방지
  __DEV__ ? process.env.EXPO_PUBLIC_DEV_WEB_URL : undefined,
  process.env.EXPO_PUBLIC_WEB_URL,
  // E2E 전용 빌드만(같은 기기에 띄운 가짜 서버 웹을 http로 열기 위함, 결정 기록 029)
  process.env.EXPO_PUBLIC_E2E === '1',
);

/** 웹 경로(`/invite/{토큰}` 등)를 이 앱이 여는 웹 주소로(개발 빌드는 개발 서버) */
export const toAppWebUrl = (path: string) => new URL(path, WEB_URL).href;
