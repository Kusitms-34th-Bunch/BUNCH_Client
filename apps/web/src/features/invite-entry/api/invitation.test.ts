import { http } from 'msw';
import { describe, expect, it } from 'vitest';
import { fail, ok } from '@/mocks/lib/envelope';
import { server } from '@/mocks/server';
import { lookupInvitation } from './invitation';

describe('lookupInvitation', () => {
  it('토큰을 경로로 인코딩해 보내고 유효하면 끝난다(응답 카드는 쓰지 않음)', async () => {
    let path = '';
    server.use(
      http.get('/api/invitations/:token', ({ request }) => {
        path = new URL(request.url).pathname;
        return ok({ name: '퇴근런클럽', introduction: '소개', code: 'ABCD2345' });
      }),
    );

    await expect(lookupInvitation('a/b c')).resolves.toBeUndefined();
    expect(path).toBe('/api/invitations/a%2Fb%20c');
  });

  it('없거나 만료된 링크는 코드를 가진 ApiError로 던진다', async () => {
    server.use(http.get('/api/invitations/:token', () => fail(404, 'INVITE_001')));

    await expect(lookupInvitation('nope')).rejects.toMatchObject({
      code: 'INVITE_001',
      status: 404,
    });
  });

  it('응답에 번치 이름이 없으면 계약 위반으로 던진다', async () => {
    server.use(
      http.get('/api/invitations/:token', () => ok({ name: '여행가조', code: 'ABCD2345' })),
    );

    await expect(lookupInvitation('token')).rejects.toBeInstanceOf(Error);
  });
});
