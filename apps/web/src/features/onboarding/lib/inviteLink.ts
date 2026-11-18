// 운영 도메인 미정으로 호스트 검사 보류; 링크 유효성·정원은 서버 검증 대상
const INVITE_PATH = /^\/invite\/[^/]+\/?$/;
// 서버가 받는 URL 밖의 입력: 43자 Base64URL 토큰 또는 8자리 보조 코드(대소문자는 서버가 맞춤). 형식이 다른 입력은 서버가 거절하고 무효 입력 횟수 제한(10분 10회)에 합산되므로 좁게 거름
// 보조 코드의 문자 범위는 명세 예시(ABCD2345)에 맞춘 영숫자이며 서버 확인이 필요함
const INVITE_CODE = /^(?:[A-Za-z0-9]{8}|[A-Za-z0-9_-]{43})$/;

export function isInviteLink(value: string) {
  try {
    const url = new URL(value.trim());
    return url.protocol === 'https:' && INVITE_PATH.test(url.pathname);
  } catch {
    return false;
  }
}

/** 초대 확인에 보낼 수 있는 입력인지: 초대 링크 URL이거나 토큰·보조 코드. 형식만 보고 유효성은 서버가 판단 */
export function isInviteInput(value: string) {
  return isInviteLink(value) || INVITE_CODE.test(value.trim());
}
