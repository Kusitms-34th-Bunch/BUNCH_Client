import { unwrapEnvelope } from '@app/api-core';
import { describe, expect, it } from 'vitest';
import { fail, noContent, ok } from './envelope';

describe('ok', () => {
  it('성공 envelope을 200으로 돌려주고 api-core가 data를 꺼낼 수 있다', async () => {
    const response = ok({ memberId: 1 });
    expect(response.status).toBe(200);
    const body: unknown = await response.json();
    expect(body).toEqual({ success: true, data: { memberId: 1 }, error: null });
    expect(unwrapEnvelope<{ memberId: number }>(body)).toEqual({ memberId: 1 });
  });
});

describe('fail', () => {
  it('실패 envelope에 상태와 오류 코드를 담는다', async () => {
    const response = fail(403, 'AUTH_002');
    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({
      success: false,
      data: null,
      error: { code: 'AUTH_002', message: 'error.forbidden', detail: null },
    });
  });

  it('명세에 메시지가 없는 코드는 코드로 만든 임시 메시지를 쓴다', async () => {
    const body = (await fail(404, 'RESOURCE_001').json()) as { error: { message: string } };
    expect(body.error.message).toBe('error.resource_001');
  });

  it('충돌 응답처럼 detail에 현재 값을 담을 수 있다', async () => {
    const body = (await fail(409, 'BUNDLE_003', { version: 3 }).json()) as {
      error: { detail: unknown };
    };
    expect(body.error.detail).toEqual({ version: 3 });
  });

  it('api-core는 실패 envelope에서 코드를 읽어 오류로 던진다', async () => {
    const body: unknown = await fail(401, 'AUTH_001').json();
    expect(() => unwrapEnvelope(body)).toThrow('error.unauthorized');
  });
});

describe('noContent', () => {
  it('본문 없이 204를 돌려준다', async () => {
    const response = noContent();
    expect(response.status).toBe(204);
    expect(await response.text()).toBe('');
  });
});
