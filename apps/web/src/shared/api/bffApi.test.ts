import { ApiError, INVALID_RESPONSE_CODE } from '@app/api-core';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { fail, ok } from '@/mocks/lib/envelope';
import { server } from '@/mocks/server';
import { bffApi, requestData } from './bffApi';

const schema = z.object({ id: z.number(), name: z.string() });
const request = () => requestData(bffApi.get('test-only/item'), schema, 'test item');
const serve = (response: () => Response) => server.use(http.get('/api/test-only/item', response));

describe('requestData', () => {
  it('성공 envelope의 data를 스키마대로 돌려준다', async () => {
    serve(() => ok({ id: 1, name: '여행가조' }));
    await expect(request()).resolves.toEqual({ id: 1, name: '여행가조' });
  });

  it('HTTP 오류는 상태·서버 오류 코드를 담은 ApiError다', async () => {
    serve(() => fail(403, 'AUTH_002'));
    await expect(request()).rejects.toMatchObject({
      name: 'ApiError',
      category: 'auth',
      status: 403,
      code: 'AUTH_002',
    });
  });

  it('계약과 다른 응답은 성공으로 넘기지 않고 INVALID_RESPONSE ApiError다', async () => {
    serve(() => ok({ id: '1', name: '여행가조' }));
    const error = await request().catch((caught: unknown) => caught);
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ category: 'validation', code: INVALID_RESPONSE_CODE });
  });

  it('JSON이 아닌 5xx 오류도 상태를 담은 server ApiError다(조회는 1회 재시도 대상)', async () => {
    serve(() => new HttpResponse('<html>Bad Gateway</html>', { status: 502 }));
    await expect(request()).rejects.toMatchObject({ category: 'server', status: 502 });
  });

  it('200이어도 실패 envelope이면 ApiError다', async () => {
    serve(() =>
      HttpResponse.json({ success: false, data: null, error: { code: 'BUNCH_001', message: 'x' } }),
    );
    await expect(request()).rejects.toMatchObject({ name: 'ApiError', code: 'BUNCH_001' });
  });
});
