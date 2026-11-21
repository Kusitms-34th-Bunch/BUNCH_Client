// 초대 토큰은 Base64URL(43자)이고 보조 코드는 8자라 길이는 넉넉히, 경로를 깨뜨리는 문자(`/`·`.`·`%` 등)만 거름
// 형식이 아닌 링크는 서버에 묻지 않고 무효로 처리(BFF 경로 검사에 걸려 일시적 오류로 오인되는 것과 무효 입력 횟수 제한 소진을 막음)
// 앱 쉘의 유니버셜 링크 판별(`apps/mobile-shell/src/invite-link.ts`)도 같은 형식
const TOKEN_PATTERN = /^[A-Za-z0-9_-]{8,64}$/;

/** 초대 링크 주소의 토큰 형식인지 */
export const isInviteToken = (token: string) => TOKEN_PATTERN.test(token);
