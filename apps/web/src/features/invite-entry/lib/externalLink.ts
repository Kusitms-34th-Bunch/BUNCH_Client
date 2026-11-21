import { OPEN_LINK_ORIGIN } from '../constants/messages';

/**
 * 이 페이지 밖(앱 열기 도메인, 카카오톡의 외부 열기)으로 이동. 테스트에서 실제 이동을 막을 수 있게 한곳에 둠
 */
export const openExternalUrl = (url: string) => {
  window.location.assign(url);
};

/**
 * 진입 페이지와 다른 도메인의 초대 주소. 같은 도메인 안 이동으로는 유니버셜 링크가 앱을 열지 않아 이 도메인으로 넘김
 * 앱이 있으면 iOS가 이 주소로 앱을 열고(쉘이 토큰을 받음), 없으면 서버가 App Store로 보냄(`next.config.mjs` redirects)
 */
export const openInviteUrl = (token: string) => `${OPEN_LINK_ORIGIN}/invite/${token}`;

/**
 * 카카오톡 인앱 브라우저에게 이 초대 링크를 밖(iOS)에서 다시 열어 달라고 요청하는 주소
 * iOS가 받아 앱이 있으면 유니버셜 링크로 앱을, 없으면 Safari를 열 것으로 예상(실기기 확인 전, docs/workflows/invite-link-entry.md)
 * 출처는 지금 페이지의 것(운영은 app.bunch.kr, 미리보기 배포는 앱이 받지 않아 Safari로 열림)
 */
export const kakaoTalkReopenInviteUrl = (token: string) =>
  `kakaotalk://web/openExternal?url=${encodeURIComponent(`${window.location.origin}/invite/${token}`)}`;
