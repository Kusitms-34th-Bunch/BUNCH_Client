/**
 * 이 브라우저가 iPhone·iPad인지(App Store 앱을 설치할 수 있는 기기). 브라우저에서만 읽음(서버 렌더는 호출부가 정함)
 * iPadOS Safari는 기본으로 Mac처럼 알려서(`Macintosh`) 터치 지점 수로 구분
 */
export const isIosDevice = () => {
  if (typeof navigator === 'undefined') return false;
  const { userAgent, maxTouchPoints } = navigator;
  return /iPhone|iPad|iPod/.test(userAgent) || (/Macintosh/.test(userAgent) && maxTouchPoints > 1);
};

/** 카카오톡 인앱 브라우저인지(User-Agent에 `KAKAOTALK`). 이 안에서는 유니버셜 링크가 앱을 열지 않을 수 있음 */
export const isKakaoTalkInApp = () =>
  typeof navigator !== 'undefined' && /KAKAOTALK/i.test(navigator.userAgent);
