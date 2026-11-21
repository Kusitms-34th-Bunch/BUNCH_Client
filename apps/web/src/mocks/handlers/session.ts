import { http, HttpResponse } from 'msw';
import { NO_SESSION_CODE } from '@/shared/api/sessionCodes';
import { mockDb } from '../db';
import { noContent } from '../lib/envelope';

const loggedIn = () => mockDb.get().session.loggedIn;
// 실제 BFF의 비로그인 응답과 같은 모양(봉투 없음, `createAuthorizedRoute`)
const unauthenticated = () =>
  HttpResponse.json({ message: '인증이 필요합니다', code: 'BFF_UNAUTHENTICATED' }, { status: 401 });

// BFF 인증 경로, 가짜 서버가 먼저 받아 쿠키 없이 가짜 DB의 세션(`session.loggedIn`)을 따름
// 소셜 로그인 화면 시연용 아님(로그인 상태로 돌아가는 경로 없음)
export const sessionHandlers = [
  http.get('/api/session', () =>
    loggedIn() ? HttpResponse.json({ authenticated: true }) : unauthenticated(),
  ),
  // 로그아웃한 가짜 세션은 쿠키가 하나도 없는 상태라 실제 BFF처럼 「세션 없음」으로 답함
  http.post('/api/auth/reissue', () =>
    loggedIn()
      ? noContent()
      : HttpResponse.json(
          { message: '로그인이 필요합니다.', code: NO_SESSION_CODE },
          { status: 401 },
        ),
  ),
  // 응답 뒤 화면을 새로 열어서 저장을 기다린 뒤 응답(기다리지 않으면 새 화면이 로그인 상태로 시작)
  http.post('/api/auth/logout', async () => {
    mockDb.update((state) => ({ ...state, session: { ...state.session, loggedIn: false } }));
    await mockDb.flush();
    return noContent();
  }),
  // 실시간 연결용 토큰(BFF가 돌려주는 모양, 본문은 봉투 없이 token·expiresAt). 가짜 서버 모드에는 실시간 서버가 없어 연결에는 쓰이지 않음
  http.post('/api/auth/ws-token', () =>
    HttpResponse.json({
      token: 'mock-ws-token',
      expiresAt: new Date(Date.now() + 30_000).toISOString(),
    }),
  ),
];
