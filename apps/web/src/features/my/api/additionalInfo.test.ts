import { isApiError } from '@app/api-core';
import { http } from 'msw';
import { describe, expect, it } from 'vitest';
import { fail, ok } from '@/mocks/lib/envelope';
import { server } from '@/mocks/server';
import { getAdditionalInfo, updateAdditionalInfoConsent } from './additionalInfo';

const respondWithTerms = (terms: unknown[]) =>
  server.use(http.get('/api/auth/terms', () => ok({ terms } as never)));

/** 보낸 동의 요청 본문을 모음 */
const captureConsent = (response: unknown = { consented: true }) => {
  const bodies: unknown[] = [];
  server.use(
    http.put('/api/members/me/additional-info-consent', async ({ request }) => {
      bodies.push(await request.json());
      return ok(response as never);
    }),
  );
  return bodies;
};

describe('getAdditionalInfo', () => {
  it('동의했으면 저장된 출생연도·성별을 화면 값으로 돌려준다', async () => {
    server.use(
      http.get('/api/members/me/additional-info', () =>
        ok({ consented: true, birthYear: 2003, gender: 'MALE' }),
      ),
    );
    await expect(getAdditionalInfo()).resolves.toEqual({
      consented: true,
      birthYear: 2003,
      gender: 'male',
    });
  });

  it('동의하지 않았으면 값이 남아 와도 버린다', async () => {
    server.use(
      http.get('/api/members/me/additional-info', () =>
        ok({ consented: false, birthYear: 2003, gender: 'FEMALE' }),
      ),
    );
    await expect(getAdditionalInfo()).resolves.toEqual({
      consented: false,
      birthYear: undefined,
      gender: undefined,
    });
  });
});

describe('updateAdditionalInfoConsent', () => {
  it('동의서 현재 버전과 함께 동의·철회를 보낸다', async () => {
    respondWithTerms([{ type: 'DEMOGRAPHICS', version: 'd-1', required: false }]);
    const bodies = captureConsent();

    await updateAdditionalInfoConsent(true);
    await updateAdditionalInfoConsent(false);

    expect(bodies).toEqual([
      { agreed: true, version: 'd-1' },
      { agreed: false, version: 'd-1' },
    ]);
  });

  it('서버가 동의서 버전을 주지 않으면 버전 없이 보낸다', async () => {
    respondWithTerms([{ type: 'SERVICE', version: 's-1', required: true }]);
    const bodies = captureConsent();

    await updateAdditionalInfoConsent(true);

    expect(bodies).toEqual([{ agreed: true }]);
  });

  it('동의할 때 약관 버전 조회가 실패하면 보내지 않고 실패로 던진다', async () => {
    server.use(http.get('/api/auth/terms', () => fail(500, 'COMMON_500')));
    const bodies = captureConsent();

    const error = await updateAdditionalInfoConsent(true).catch((caught: unknown) => caught);

    expect(isApiError(error)).toBe(true);
    expect(bodies).toEqual([]);
  });

  it('약관 버전 조회가 실패해도 버전 없이 보내 철회가 막히지 않는다', async () => {
    server.use(http.get('/api/auth/terms', () => fail(500, 'COMMON_500')));
    const bodies = captureConsent({ consented: false });

    await updateAdditionalInfoConsent(false);

    expect(bodies).toEqual([{ agreed: false }]);
  });

  it('응답의 동의 상태를 돌려주고, 서버 거절은 ApiError로 던진다', async () => {
    respondWithTerms([]);
    captureConsent({ consented: false });
    await expect(updateAdditionalInfoConsent(false)).resolves.toEqual({
      consented: false,
      birthYear: undefined,
      gender: undefined,
    });

    server.use(http.put('/api/members/me/additional-info-consent', () => fail(500, 'COMMON_500')));
    const error = await updateAdditionalInfoConsent(true).catch((caught: unknown) => caught);
    expect(isApiError(error)).toBe(true);
  });
});
