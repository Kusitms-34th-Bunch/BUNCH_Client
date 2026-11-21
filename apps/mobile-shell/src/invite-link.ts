// 유니버셜 링크로 앱을 여는 도메인(app.json `ios.associatedDomains`, 웹 `/.well-known/apple-app-site-association`과 같은 값)
// app.bunch.kr은 공유하는 초대 링크, open.bunch.kr은 웹 진입 페이지의 「초대장 확인하기」가 넘기는 앱 열기 도메인
// 앱 런타임의 URL 구현(React Native 폴리필)은 표준과 해석이 달라(결정 기록 029) URL 객체로 나누지 않고 주소 전체를 정규식으로 판별
// 토큰은 웹 진입 페이지와 같은 형식(Base64URL 43자, 보조 코드 8자). 경로를 깨뜨리는 문자(`/`·`.`·`%` 등)는 받지 않음
const INVITE_LINK =
  /^https:\/\/(?:app|open)\.bunch\.kr\/invite\/([A-Za-z0-9_-]{8,64})\/?(?:[?#].*)?$/i;
// 연결 도메인의 주소(계정 정보·포트 없이 호스트 바로 뒤가 경로·쿼리·해시이거나 끝)
const LINK_DOMAIN = /^https:\/\/(?:app|open)\.bunch\.kr(?:[/?#]|$)/i;

/**
 * 앱을 연 주소가 초대 링크(`https://app.bunch.kr/invite/{토큰}`, `https://open.bunch.kr/invite/{토큰}`)면 WebView에서 열 웹 경로(`/invite/{토큰}`), 아니면 null
 * 주소를 그대로 열지 않고 토큰만 꺼내 경로를 새로 만듦(쿼리·해시는 버림)
 */
export function toInviteWebPath(value: string): string | null {
  const token = INVITE_LINK.exec(value)?.[1];
  return token ? `/invite/${token}` : null;
}

/**
 * 연결 도메인의 주소인지(초대 형식이 아니어도). 이런 주소는 앱 화면(expo-router)으로 해석하면
 * 맞는 화면이 없어 Unmatched Route가 WebView를 가리므로 화면을 옮기지 않음
 */
export function isLinkDomainUrl(value: string): boolean {
  return LINK_DOMAIN.test(value);
}
