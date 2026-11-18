import { http } from 'msw';
import { describe, expect, it } from 'vitest';
import { ok } from '@/mocks/lib/envelope';
import { server } from '@/mocks/server';
import { getTermVersions } from './termVersions';

const respondWithTerms = (terms: unknown[]) =>
  server.use(http.get('/api/auth/terms', () => ok({ terms } as never)));

const REQUIRED_TERMS = [
  { type: 'SERVICE', version: 's-1', required: true },
  { type: 'PRIVACY', version: 'p-1', required: true },
  { type: 'AGE_OVER_14', version: 'a-1', required: true },
];

describe('getTermVersions', () => {
  it('서버가 앱이 모르는 약관 종류를 추가해도 아는 종류만 골라 쓴다', async () => {
    respondWithTerms([...REQUIRED_TERMS, { type: 'MARKETING', version: 'm-1', required: false }]);

    await expect(getTermVersions()).resolves.toEqual({
      SERVICE: 's-1',
      PRIVACY: 'p-1',
      AGE_OVER_14: 'a-1',
    });
  });

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

  it('버전이 비어 있으면 계약 위반으로 던진다', async () => {
    respondWithTerms([{ type: 'SERVICE', version: '', required: true }]);
    await expect(getTermVersions()).rejects.toThrow();
  });
});
