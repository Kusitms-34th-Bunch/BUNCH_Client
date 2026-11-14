import { http, HttpResponse } from 'msw';
import { noContent } from '../lib/envelope';

// BFF 인증 경로, 가짜 서버가 먼저 받아 쿠키·로그인 없이 항상 로그인 상태
// 소셜 로그인 화면 시연용 아님
export const sessionHandlers = [
  http.get('/api/session', () => HttpResponse.json({ authenticated: true })),
  http.post('/api/auth/reissue', () => noContent()),
  http.post('/api/auth/logout', () => noContent()),
  // 실시간 연결용 토큰(BFF가 돌려주는 모양, 본문은 봉투 없이 token·expiresAt). 가짜 서버 모드에는 실시간 서버가 없어 연결에는 쓰이지 않음
  http.post('/api/auth/ws-token', () =>
    HttpResponse.json({
      token: 'mock-ws-token',
      expiresAt: new Date(Date.now() + 30_000).toISOString(),
    }),
  ),
];
