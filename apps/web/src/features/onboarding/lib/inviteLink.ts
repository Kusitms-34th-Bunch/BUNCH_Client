// 운영 도메인 미정으로 호스트 검사 보류; 링크 유효성·정원은 서버 검증 대상
const INVITE_PATH = /^\/invite\/[^/]+\/?$/;

export function isInviteLink(value: string) {
  try {
    const url = new URL(value.trim());
    return url.protocol === 'https:' && INVITE_PATH.test(url.pathname);
  } catch {
    return false;
  }
}
