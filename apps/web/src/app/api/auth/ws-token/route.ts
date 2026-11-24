import { NextResponse } from 'next/server';
import { requestWsToken } from '@/shared/api/server/authSession';
import { createAuthorizedRoute } from '@/shared/api/server/createAuthorizedRoute';

/**
 * 실시간(STOMP) 연결용 토큰 발급: 브라우저는 httpOnly 쿠키의 access 토큰을 읽을 수 없어,
 * BFF가 쿠키로 백엔드 `POST /auth/ws-token`을 불러 연결 직전에 쓸 토큰만 돌려줌(docs/decisions/records/024)
 * 토큰은 응답으로만 전달하고 어디에도 저장·기록하지 않으며 캐시되지 않게 함
 */
export const POST = createAuthorizedRoute(async ({ accessToken }) => {
  const wsToken = await requestWsToken(accessToken);
  return NextResponse.json(wsToken, { headers: { 'Cache-Control': 'no-store' } });
});
