import { http } from 'msw';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type * as BffApiModule from '@/shared/api/bffApi';
import { fail, ok } from '@/mocks/lib/envelope';
import { server } from '@/mocks/server';
import { checkNicknameAvailability, registerMember } from './registration';

// 가입 저장은 multipart 본문(FormData)을 직접 확인하려고 bffApi를 대체함
const post = vi.hoisted(() =>
  vi.fn<(_path: string, _options: { body: FormData }) => { json: () => Promise<unknown> }>(),
);
vi.mock('@/shared/api/bffApi', async (importOriginal) => {
  const original = await importOriginal<typeof BffApiModule>();
  return { ...original, bffApi: { ...original.bffApi, post } };
});

const COMPLETED = { memberId: 1, signupStatus: 'COMPLETED', nickname: '지원', imageUrl: null };
const JPEG_DATA_URL = 'data:image/jpeg;base64,YWJj';

const respondWithTerms = (demographicsVersion?: string) =>
  server.use(
    http.get('/api/auth/terms', () =>
      ok({
        terms: [
          { type: 'SERVICE', version: 's-1', required: true },
          { type: 'PRIVACY', version: 'p-1', required: true },
          { type: 'AGE_OVER_14', version: 'a-1', required: true },
          ...(demographicsVersion
            ? [{ type: 'DEMOGRAPHICS', version: demographicsVersion, required: false }]
            : []),
        ],
      } as never),
    ),
  );

const sentProfile = async () => {
  const body = post.mock.calls[0]?.[1].body;
  const profile = body?.get('profile') as Blob;
  return { body, profile, json: JSON.parse(await profile.text()) as Record<string, unknown> };
};

describe('registerMember', () => {
  beforeEach(() => {
    post.mockReset();
    post.mockReturnValue({
      json: () => Promise.resolve({ success: true, data: COMPLETED, error: null }),
    });
  });

  it('닉네임만 있으면 프로필 JSON 하나만 multipart로 보낸다(선택 약관에 동의하지 않음)', async () => {
    await registerMember({ nickname: '지원', demographicsConsent: false });

    expect(post.mock.calls[0]?.[0]).toBe('members/me/registration');
    const { body, profile, json } = await sentProfile();
    expect(profile.type).toBe('application/json');
    expect(json).toEqual({ nickname: '지원' });
    expect(body?.has('photo')).toBe(false);
  });

  it('선택 약관에 동의하지 않았으면 입력한 출생연도·성별도 보내지 않는다', async () => {
    await registerMember({
      nickname: '지원',
      demographicsConsent: false,
      birthYear: 1998,
      gender: 'female',
    });

    expect((await sentProfile()).json).toEqual({ nickname: '지원' });
  });

  it('동의했으면 현재 동의 버전과 출생연도·성별(서버 표기)을 함께 보낸다', async () => {
    respondWithTerms('d-1');

    await registerMember({
      nickname: '지원',
      demographicsConsent: true,
      birthYear: 1998,
      gender: 'male',
    });

    expect((await sentProfile()).json).toEqual({
      nickname: '지원',
      demographicsConsentVersion: 'd-1',
      birthYear: 1998,
      gender: 'MALE',
    });
  });

  it('동의했지만 아무것도 입력하지 않았으면 동의 버전만 보낸다', async () => {
    respondWithTerms('d-1');

    await registerMember({ nickname: '지원', demographicsConsent: true });

    expect((await sentProfile()).json).toEqual({
      nickname: '지원',
      demographicsConsentVersion: 'd-1',
    });
  });

  it('서버가 동의 버전을 주지 않으면 출생연도·성별은 보내지 않는다(동의 없이 보내면 서버가 거부)', async () => {
    respondWithTerms();

    await registerMember({
      nickname: '지원',
      demographicsConsent: true,
      birthYear: 1998,
      gender: 'female',
    });

    expect((await sentProfile()).json).toEqual({ nickname: '지원' });
  });

  it('사진을 고르면 JPEG 파일로 함께 보낸다', async () => {
    await registerMember({ nickname: '지원', demographicsConsent: false, photo: JPEG_DATA_URL });

    const { body } = await sentProfile();
    const photo = body?.get('photo') as File;
    expect(photo.type).toBe('image/jpeg');
    expect(photo.name).toBe('profile.jpg');
    expect(await photo.text()).toBe('abc');
  });

  it('사진 데이터가 올바르지 않으면 요청 없이 던진다', async () => {
    await expect(
      registerMember({ nickname: '지원', demographicsConsent: false, photo: 'not-a-data-url' }),
    ).rejects.toThrow();
    expect(post).not.toHaveBeenCalled();
  });

  it('가입 결과를 돌려준다', async () => {
    await expect(registerMember({ nickname: '지원', demographicsConsent: false })).resolves.toEqual(
      COMPLETED,
    );
  });

  it('응답이 계약에 어긋나면 던진다', async () => {
    post.mockReturnValue({
      json: () => Promise.resolve({ success: true, data: { memberId: 1 }, error: null }),
    });

    await expect(
      registerMember({ nickname: '지원', demographicsConsent: false }),
    ).rejects.toThrow();
  });

  it('서버 요청이 실패하면 ApiError로 던진다', async () => {
    post.mockImplementation(() => {
      throw new Error('요청 실패');
    });

    await expect(
      registerMember({ nickname: '지원', demographicsConsent: false }),
    ).rejects.toThrow();
  });
});

describe('checkNicknameAvailability', () => {
  it('서버가 알려 준 사용 가능 여부를 돌려주고 닉네임을 쿼리로 보낸다', async () => {
    const queries: (string | null)[] = [];
    server.use(
      http.get('/api/members/nickname-availability', ({ request }) => {
        queries.push(new URL(request.url).searchParams.get('nickname'));
        return ok({ normalizedValue: '지원', available: false });
      }),
    );

    await expect(checkNicknameAvailability('지원')).resolves.toBe(false);
    expect(queries).toEqual(['지원']);
  });

  it('서버 오류이거나 계약에 어긋난 응답이면 던진다', async () => {
    server.use(http.get('/api/members/nickname-availability', () => fail(503, 'AUTH_018')));
    await expect(checkNicknameAvailability('지원')).rejects.toThrow();

    server.use(
      http.get('/api/members/nickname-availability', () =>
        ok({ normalizedValue: '지원' } as never),
      ),
    );
    await expect(checkNicknameAvailability('지원')).rejects.toThrow();
  });
});
