// 브라우저가 실제로 해석할 수 있는 https 절대 주소인지(`https://%`처럼 모양만 맞고 해석되지 않는 주소는 거부)
const isParsableHttps = (url: string) => {
  try {
    return new URL(url).protocol === 'https:';
  } catch {
    return false;
  }
};

/** 운영 응답은 신뢰 경계 밖이라 img src에는 해석 가능한 https 주소나 같은 출처 경로(//나 /\로 시작하지 않는)만 허용 */
export const isSafeImageUrl = (url: string) =>
  (/^https:\/\/\S+$/.test(url) && isParsableHttps(url)) || /^\/(?![/\\])\S*$/.test(url);
