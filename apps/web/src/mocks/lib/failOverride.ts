import { http } from 'msw';
import { fail } from './envelope';

/**
 * E2E가 가짜 서버 요청을 일부러 실패시키는 목록(sessionStorage). 「메서드 경로정규식」 문자열 배열, 메서드 `*`는 모두
 * 예: `["GET ^/api/bunches/\\d+/photos$"]`. 화면 오류 안내·다시 시도 검사용(#601), 가짜 서버를 켠 빌드에만 들어감
 */
export const MOCK_FAIL_KEY = 'bunch-mock-fail';

const failRules = (): string[] => {
  try {
    const value: unknown = JSON.parse(sessionStorage.getItem(MOCK_FAIL_KEY) ?? '[]');
    return Array.isArray(value) ? value.filter((rule) => typeof rule === 'string') : [];
  } catch {
    return [];
  }
};

/** 실패 목록에 맞는 요청은 500, 아니면 다음 처리기로 넘김 */
export const failOverrideHandler = http.all('/api/*', ({ request }) => {
  const { pathname } = new URL(request.url);
  const hit = failRules().some((rule) => {
    // 첫 공백 앞이 메서드, 뒤가 경로 정규식(정규식 안의 공백 유지). 잘못된 정규식은 건너뜀
    const space = rule.indexOf(' ');
    const method = rule.slice(0, space);
    if (space < 0 || (method !== '*' && method !== request.method)) return false;
    try {
      return new RegExp(rule.slice(space + 1)).test(pathname);
    } catch {
      return false;
    }
  });
  return hit ? fail(500, 'COMMON_999') : undefined;
});
