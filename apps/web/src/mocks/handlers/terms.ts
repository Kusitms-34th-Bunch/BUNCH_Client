import { http } from 'msw';
import { ok } from '../lib/envelope';

// BFF 경로는 백엔드 경로에서 `/api/v1`을 뺀 경로(docs/architecture/api-boundary.md)
// 약관 버전은 임시 값. 원문은 앱이 갖고 서버는 종류·버전만 줌
export const termHandlers = [
  // GET /api/v1/auth/terms
  http.get('/api/auth/terms', () =>
    ok({
      terms: [
        { type: 'SERVICE', version: 'mock-service-1', required: true },
        { type: 'PRIVACY', version: 'mock-privacy-1', required: true },
        { type: 'AGE_OVER_14', version: 'mock-age-1', required: true },
        { type: 'DEMOGRAPHICS', version: 'mock-demographics-1', required: false },
      ],
    }),
  ),

  // POST /api/v1/auth/terms/agreements: 가짜 서버는 가입을 마친 상태라 상태를 바꾸지 않고 성공만 돌려줌
  http.post('/api/auth/terms/agreements', () => ok(null)),
];
