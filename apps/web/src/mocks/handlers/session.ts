import { http, HttpResponse } from 'msw';
import { noContent } from '../lib/envelope';

// BFF 인증 경로, 가짜 서버가 먼저 받아 쿠키·로그인 없이 항상 로그인 상태
// 소셜 로그인 화면 시연용 아님
export const sessionHandlers = [
  http.get('/api/session', () => HttpResponse.json({ authenticated: true })),
  http.post('/api/auth/reissue', () => noContent()),
  http.post('/api/auth/logout', () => noContent()),
];
