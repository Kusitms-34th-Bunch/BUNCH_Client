import { http } from 'msw';
import { describe, expect, it } from 'vitest';
import { fail, ok } from '@/mocks/lib/envelope';
import { server } from '@/mocks/server';
import { checkNicknameAvailability } from './nickname';

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
