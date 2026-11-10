import { http } from 'msw';
import { describe, expect, it } from 'vitest';
import { fail, ok } from '@/mocks/lib/envelope';
import { server } from '@/mocks/server';
import {
  checkBunchNameAvailability,
  createBunch,
  issueBunchInvitation,
  resetBunchProfileImage,
  updateBunchProfileImage,
} from './bunches';

const BUNCH = { id: 7, name: '퇴근런클럽', characterType: 'TYPE_1', imageUrl: null };
const JPEG = 'data:image/jpeg;base64,YWJj';

describe('checkBunchNameAvailability', () => {
  it('이름을 쿼리로 보내고 사용 가능 여부를 돌려준다', async () => {
    let received: string | null = null;
    server.use(
      http.get('/api/bunches/name-availability', ({ request }) => {
        received = new URL(request.url).searchParams.get('name');
        return ok({ normalizedValue: '퇴근런클럽', available: false });
      }),
    );

    expect(await checkBunchNameAvailability('퇴근런클럽')).toBe(false);
    expect(received).toBe('퇴근런클럽');
  });
});

describe('createBunch', () => {
  it('멱등 키 헤더와 서버 값(공개 범위 대문자)으로 보내고 화면용 번치를 돌려준다', async () => {
    let received: { key: string | null; body: unknown } | undefined;
    server.use(
      http.post('/api/bunches', async ({ request }) => {
        received = { key: request.headers.get('idempotency-key'), body: await request.json() };
        return ok({ ...BUNCH, imageUrl: 'https://cdn.example.com/b.jpg' });
      }),
    );

    const created = await createBunch(
      {
        name: ' 퇴근런클럽 ',
        visibility: 'private',
        introduction: '  함께 달려요 ',
        characterType: 'TYPE_1',
      },
      'key-1',
    );

    expect(received).toEqual({
      key: 'key-1',
      body: {
        name: '퇴근런클럽',
        introduction: '함께 달려요',
        visibility: 'PRIVATE',
        characterType: 'TYPE_1',
      },
    });
    expect(created).toEqual({
      id: '7',
      name: '퇴근런클럽',
      characterType: 'TYPE_1',
      imageUrl: 'https://cdn.example.com/b.jpg',
    });
  });

  it('사진 주소가 없거나 안전하지 않으면 imageUrl을 비운다(기본 이미지)', async () => {
    server.use(http.post('/api/bunches', () => ok({ ...BUNCH, imageUrl: 'javascript:alert(1)' })));

    const created = await createBunch(
      { name: '퇴근런클럽', visibility: 'public', introduction: '소개', characterType: 'TYPE_1' },
      'key-1',
    );

    expect(created).not.toHaveProperty('imageUrl');
  });

  it('서버 오류는 코드를 가진 ApiError로 던진다', async () => {
    server.use(http.post('/api/bunches', () => fail(409, 'BUNCH_001')));

    await expect(
      createBunch(
        { name: '퇴근런클럽', visibility: 'public', introduction: '소개', characterType: 'TYPE_1' },
        'key-1',
      ),
    ).rejects.toMatchObject({ code: 'BUNCH_001', status: 409 });
  });
});

describe('번치 대표 사진', () => {
  it('JPEG를 multipart의 photo 파일로 보낸다', async () => {
    let photo: FormDataEntryValue | null = null;
    server.use(
      http.put('/api/bunches/7/profile-image', async ({ request }) => {
        photo = (await request.formData()).get('photo');
        return ok({ ...BUNCH, imageUrl: 'https://cdn.example.com/new.jpg' });
      }),
    );

    const updated = await updateBunchProfileImage('7', JPEG);

    expect(photo).toBeInstanceOf(File);
    expect((photo as unknown as File).type).toBe('image/jpeg');
    expect(updated.imageUrl).toBe('https://cdn.example.com/new.jpg');
  });

  it('JPEG가 아니면 보내지 않고 던진다', async () => {
    await expect(updateBunchProfileImage('7', 'data:image/png;base64,YWJj')).rejects.toThrow();
  });

  it('기본 이미지 적용은 DELETE로 사진을 비운다', async () => {
    server.use(http.delete('/api/bunches/7/profile-image', () => ok(BUNCH)));

    expect(await resetBunchProfileImage('7')).not.toHaveProperty('imageUrl');
  });
});

describe('issueBunchInvitation', () => {
  it('번치의 초대 링크와 만료 시각을 돌려준다', async () => {
    server.use(
      http.post('/api/bunches/7/invitations', () =>
        ok({
          url: 'https://bunch.app/invite/abc',
          code: 'ABCD1234',
          expiresAt: '2026-11-17T00:00:00Z',
        }),
      ),
    );

    expect(await issueBunchInvitation('7')).toEqual({
      url: 'https://bunch.app/invite/abc',
      expiresAt: '2026-11-17T00:00:00Z',
    });
  });
});
