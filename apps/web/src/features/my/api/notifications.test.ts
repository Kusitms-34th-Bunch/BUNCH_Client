import { http } from 'msw';
import { describe, expect, it } from 'vitest';
import { fail, ok } from '@/mocks/lib/envelope';
import { server } from '@/mocks/server';
import { getPushPreferences, updatePushPreferences } from './notifications';

describe('getPushPreferences', () => {
  it('전체 수신과 알림 종류별 수신을 돌려준다', async () => {
    server.use(
      http.get('/api/members/me/push-preferences', () =>
        ok({ enabled: false, categories: { BUNDLE_NEWS: true, REACTION: false } }),
      ),
    );

    await expect(getPushPreferences()).resolves.toEqual({
      enabled: false,
      types: { BUNDLE_NEWS: true, REACTION: false },
    });
  });

  it('서버 오류이거나 계약에 어긋난 응답이면 던진다', async () => {
    server.use(http.get('/api/members/me/push-preferences', () => fail(401, 'AUTH_001')));
    await expect(getPushPreferences()).rejects.toThrow();

    server.use(
      http.get('/api/members/me/push-preferences', () =>
        ok({ enabled: true, categories: { BUNDLE_NEWS: 'yes' } } as never),
      ),
    );
    await expect(getPushPreferences()).rejects.toThrow();
  });
});

describe('updatePushPreferences', () => {
  it('보낸 변경만 JSON 본문으로 PATCH하고 바뀐 전체 설정을 돌려준다', async () => {
    const bodies: unknown[] = [];
    server.use(
      http.patch('/api/members/me/push-preferences', async ({ request }) => {
        bodies.push(await request.json());
        return ok({ enabled: true, categories: { FOLLOW: false } });
      }),
    );

    await expect(updatePushPreferences({ types: { FOLLOW: false } })).resolves.toEqual({
      enabled: true,
      types: { FOLLOW: false },
    });
    expect(bodies).toEqual([{ categories: { FOLLOW: false } }]);
  });

  it('서버가 거절하면 던진다', async () => {
    server.use(http.patch('/api/members/me/push-preferences', () => fail(400, 'COMMON_001')));

    await expect(updatePushPreferences({ types: { UNKNOWN: true } })).rejects.toThrow();
  });
});
