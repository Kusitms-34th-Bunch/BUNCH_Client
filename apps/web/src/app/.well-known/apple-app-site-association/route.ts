/**
 * iOS 유니버셜 링크: 이 도메인의 초대 링크(`/invite/{토큰}`)를 앱(`kr.bunch.app`)이 열도록 Apple에 알림
 * 앱의 Associated Domains(`apps/mobile-shell/app.json`의 `applinks:app.bunch.kr`·`applinks:open.bunch.kr`)와 짝이고, 초대 외 경로는 웹 그대로
 * 같은 웹 앱이 두 도메인을 함께 받아 이 파일도 두 도메인에서 같이 나옴(open.bunch.kr의 /invite는 next.config.mjs가 App Store로 보냄)
 * Apple은 이 파일을 자기 CDN으로 받아 두므로 바꾼 뒤 반영까지 시간이 걸림. 리다이렉트 없이 200·JSON으로 내려야 함
 */
const APP_ID = '9CGCR9499H.kr.bunch.app';

const ASSOCIATION = {
  applinks: {
    details: [{ appIDs: [APP_ID], components: [{ '/': '/invite/*', comment: '초대 링크' }] }],
  },
};

export const dynamic = 'force-static';

export function GET() {
  return Response.json(ASSOCIATION, {
    headers: { 'Cache-Control': 'public, max-age=3600' },
  });
}
