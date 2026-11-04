/** 운영 응답은 신뢰 경계 밖이라 img src에는 https 주소나 같은 출처 경로(//나 /\로 시작하지 않는)만 허용 */
export const isSafeImageUrl = (url: string) =>
  /^https:\/\/\S+$/.test(url) || /^\/(?![/\\])\S*$/.test(url);
