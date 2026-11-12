import { http } from 'msw';
import { describe, expect, it } from 'vitest';
import { fail, ok } from '@/mocks/lib/envelope';
import { server } from '@/mocks/server';
import { getPushPreferences, updatePushPreferences } from './notifications';

describe('getPushPreferences', () => {
  it('전체 수신과 알림 종류별 수신을 돌려준다', async () => {
    server.use(
      http.get('/api/members/me/push-preferences', () =>
        ok({ enabled: false, types: { DRAFT_ACTIVITY: true, BUNDLE_LIKED: false } }),
      ),
    );

    await expect(getPushPreferences()).resolves.toEqual({
      enabled: false,
      types: { DRAFT_ACTIVITY: true, BUNDLE_LIKED: false },
    });
  });

  it('서버 오류이거나 계약에 어긋난 응답이면 던진다', async () => {
    server.use(http.get('/api/members/me/push-preferences', () => fail(401, 'AUTH_001')));
    await expect(getPushPreferences()).rejects.toThrow();

    server.use(
      http.get('/api/members/me/push-preferences', () =>
        ok({ enabled: true, types: { DRAFT_ACTIVITY: 'yes' } } as never),
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
        return ok({ enabled: true, types: { COMMENT_REMINDER: false } });
      }),
    );

    await expect(updatePushPreferences({ types: { COMMENT_REMINDER: false } })).resolves.toEqual({
      enabled: true,
      types: { COMMENT_REMINDER: false },
    });
    expect(bodies).toEqual([{ types: { COMMENT_REMINDER: false } }]);
  });

  it('서버가 거절하면 던진다', async () => {
    server.use(http.patch('/api/members/me/push-preferences', () => fail(400, 'COMMON_001')));

    await expect(updatePushPreferences({ types: { UNKNOWN: true } })).rejects.toThrow();
  });
});
