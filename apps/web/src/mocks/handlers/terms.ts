import { http } from 'msw';
import { mockDb } from '../db';
import { MOCK_MY_MEMBER_ID } from '../db/seed';
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

  // POST /api/v1/auth/terms/agreements: 약관 동의를 기록하고, 선택 약관(DEMOGRAPHICS)에 동의했으면 추가 개인정보 동의로 저장
  // 버전 값은 검사하지 않음
  http.post('/api/auth/terms/agreements', async ({ request }) => {
    const body = (await request.json().catch(() => null)) as {
      agreements?: { type?: string; agreed?: boolean }[];
    } | null;
    const demographics = body?.agreements?.some(
      (agreement) => agreement.type === 'DEMOGRAPHICS' && agreement.agreed === true,
    );
    mockDb.update((state) => ({
      ...state,
      session: { ...state.session, termsAccepted: true },
      members: demographics
        ? state.members.map((member) =>
            member.memberId === MOCK_MY_MEMBER_ID
              ? { ...member, additionalInfoConsented: true }
              : member,
          )
        : state.members,
    }));
    return ok(null);
  }),
];
