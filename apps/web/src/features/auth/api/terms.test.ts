import { http } from 'msw';
import { describe, expect, it } from 'vitest';
import { fail, ok } from '@/mocks/lib/envelope';
import { server } from '@/mocks/server';
import { getTermVersions, saveTermsAgreements } from './terms';

const respondWithTerms = (terms: unknown[]) =>
  server.use(http.get('/api/auth/terms', () => ok({ terms } as never)));

const REQUIRED_TERMS = [
  { type: 'SERVICE', version: 's-1', required: true },
  { type: 'PRIVACY', version: 'p-1', required: true },
  { type: 'AGE_OVER_14', version: 'a-1', required: true },
];

// 동의 저장 요청 본문을 가로챔
const captureAgreements = (status = 200) => {
  const bodies: unknown[] = [];
  server.use(
    http.post('/api/auth/terms/agreements', async ({ request }) => {
      bodies.push(await request.json());
      return status === 200 ? ok(null) : fail(status, 'AUTH_016');
    }),
  );
  return bodies;
};

describe('getTermVersions', () => {
  it('약관 종류별 현재 버전을 돌려준다', async () => {
    respondWithTerms([
      ...REQUIRED_TERMS,
      { type: 'DEMOGRAPHICS', version: 'd-1', required: false },
    ]);

    await expect(getTermVersions()).resolves.toEqual({
      SERVICE: 's-1',
      PRIVACY: 'p-1',
      AGE_OVER_14: 'a-1',
      DEMOGRAPHICS: 'd-1',
    });
  });

  it('알 수 없는 약관 종류이거나 버전이 비어 있으면 계약 위반으로 던진다', async () => {
    respondWithTerms([{ type: 'MARKETING', version: 'm-1', required: false }]);
    await expect(getTermVersions()).rejects.toThrow();

    respondWithTerms([{ type: 'SERVICE', version: '', required: true }]);
    await expect(getTermVersions()).rejects.toThrow();
  });
});

describe('saveTermsAgreements', () => {
  it('필수 3종을 현재 버전으로 보내고 선택 약관은 동의하지 않으면 보내지 않는다', async () => {
    respondWithTerms([
      ...REQUIRED_TERMS,
      { type: 'DEMOGRAPHICS', version: 'd-1', required: false },
    ]);
    const bodies = captureAgreements();

    await saveTermsAgreements({ demographics: false });

    expect(bodies).toEqual([
      {
        agreements: [
          { type: 'SERVICE', version: 's-1', agreed: true },
          { type: 'PRIVACY', version: 'p-1', agreed: true },
          { type: 'AGE_OVER_14', version: 'a-1', agreed: true },
        ],
      },
    ]);
  });

  it('선택 약관에 동의했으면 함께 보낸다', async () => {
    respondWithTerms([
      ...REQUIRED_TERMS,
      { type: 'DEMOGRAPHICS', version: 'd-1', required: false },
    ]);
    const bodies = captureAgreements();

    await saveTermsAgreements({ demographics: true });

    expect(bodies).toEqual([
      {
        agreements: [
          { type: 'SERVICE', version: 's-1', agreed: true },
          { type: 'PRIVACY', version: 'p-1', agreed: true },
          { type: 'AGE_OVER_14', version: 'a-1', agreed: true },
          { type: 'DEMOGRAPHICS', version: 'd-1', agreed: true },
        ],
      },
    ]);
  });

  it('서버가 선택 약관 버전을 주지 않으면 그 항목만 빼고 저장한다', async () => {
    respondWithTerms(REQUIRED_TERMS);
    const bodies = captureAgreements();

    await saveTermsAgreements({ demographics: true });

    expect(bodies).toHaveLength(1);
    expect(JSON.stringify(bodies[0])).not.toContain('DEMOGRAPHICS');
  });

  it('필수 약관 버전을 받지 못하면 저장 요청 없이 던진다', async () => {
    respondWithTerms(REQUIRED_TERMS.filter(({ type }) => type !== 'PRIVACY'));
    const bodies = captureAgreements();

    await expect(saveTermsAgreements({ demographics: false })).rejects.toThrow();
    expect(bodies).toEqual([]);
  });

  it('버전이 어긋나 서버가 거부하면(409) ApiError로 던진다', async () => {
    respondWithTerms(REQUIRED_TERMS);
    captureAgreements(409);

    await expect(saveTermsAgreements({ demographics: false })).rejects.toMatchObject({
      status: 409,
      code: 'AUTH_016',
    });
  });
});
