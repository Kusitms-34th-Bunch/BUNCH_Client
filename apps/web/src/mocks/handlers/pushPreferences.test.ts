import { describe, expect, it } from 'vitest';
// 가짜 서버 응답에 기대므로 직접 연결(PR의 `--changed`가 handler 변경 때 이 테스트를 고르게)
import '../server';
import { mockDb } from '../db';
import { PUSH_NOTIFICATION_TYPES } from '../db/seed';

const URL_PATH = '/api/members/me/push-preferences';
type Envelope = {
  data?: { enabled: boolean; categories: Record<string, boolean> };
  error?: { code: string };
};

const read = async (response: Response) => (await response.json()) as Envelope;
const patch = (body: unknown) =>
  fetch(URL_PATH, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });

describe('푸시 수신 설정 handler', () => {
  it('처음에는 전체와 21개 알림 종류가 모두 켜져 있다', async () => {
    const { data } = await read(await fetch(URL_PATH));

    expect(data?.enabled).toBe(true);
    expect(Object.keys(data?.categories ?? {})).toEqual([...PUSH_NOTIFICATION_TYPES]);
    expect(Object.values(data?.categories ?? {}).every(Boolean)).toBe(true);
  });

  it('보낸 값만 바꾸고 전체 설정을 돌려주며 다음 조회에도 남는다', async () => {
    const response = await patch({ categories: { COMMENT_REMINDER: false } });
    const { data } = await read(response);

    expect(response.status).toBe(200);
    expect(data?.categories.COMMENT_REMINDER).toBe(false);
    expect(data?.categories.DRAFT_ACTIVITY).toBe(true);
    expect(data?.enabled).toBe(true);
    expect(mockDb.get().pushPreferences.categories.COMMENT_REMINDER).toBe(false);

    await patch({ enabled: false });
    const after = await read(await fetch(URL_PATH));
    expect(after.data?.enabled).toBe(false);
    expect(after.data?.categories.COMMENT_REMINDER).toBe(false);
  });

  it('알 수 없는 알림 종류는 COMMON_001(400)이다', async () => {
    const response = await patch({ categories: { NOT_A_TYPE: true } });

    expect(response.status).toBe(400);
    expect((await read(response)).error?.code).toBe('COMMON_001');
  });

  it.each([
    ['문자열 값', { categories: { COMMENT_REMINDER: 'no' } }],
    ['null 값', { categories: { COMMENT_REMINDER: null } }],
    ['불리언이 아닌 enabled', { enabled: 'yes' }],
  ])('%s은 COMMON_002(400)이다', async (_name, body) => {
    const response = await patch(body);

    expect(response.status).toBe(400);
    expect((await read(response)).error?.code).toBe('COMMON_002');
  });
});
