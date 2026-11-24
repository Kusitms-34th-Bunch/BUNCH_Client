// 서비스 전체에 걸린 주소·스토어 정보. 한 feature만 써도 여기 둠(도메인·스토어가 바뀌면 이 파일과 아래 설정만 고침)
// 같은 값을 쓰는 앱 밖 설정: `next.config.mjs` redirects, 쉘 `app.json` `applinks:`·`src/invite-link.ts`

/** 운영 웹 주소. 공유하는 초대 링크, canonical, sitemap·robots가 씀 */
export const SITE_ORIGIN = 'https://app.bunch.kr';

/** 앱 열기 전용 도메인. 같은 도메인 안 이동으로는 유니버셜 링크가 앱을 열지 않아 따로 둠, 화면 없음 */
export const OPEN_LINK_ORIGIN = 'https://open.bunch.kr';

/** App Store Connect 앱 Apple ID(Safari 앱 배너 `itunes.appId`와 스토어 주소) */
export const APP_STORE_APP_ID = '6834488511';
export const APP_STORE_URL = `https://apps.apple.com/app/id${APP_STORE_APP_ID}`;

/** 서비스 이름(앱스토어·웹 모두 대문자, 로고 그림만 소문자 bunch) */
export const SITE_NAME = 'BUNCH';

/** 서비스 슬로건. 검색 결과·공유 미리보기·PWA 설명에 씀 */
export const SITE_SLOGAN = '함께한 순간이 모이는 곳';

/** 공용 공유 이미지(Figma 「오픈그래프 이미지」 슬로건판, 1.5배). 초대장은 전용 이미지를 따로 씀 */
export const SITE_OG_IMAGE = {
  url: '/images/og/default.png',
  width: 1800,
  height: 945,
  alt: `${SITE_NAME} ${SITE_SLOGAN}`,
};
