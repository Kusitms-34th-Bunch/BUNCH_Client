// @vitest-environment node

import { ApiError } from '@app/api-core';
import { describe, expect, it } from 'vitest';
import { toErrorResponse } from './routeError';

describe('toErrorResponse', () => {
  it('상태가 있는 오류는 상태·메시지·코드를 그대로 전달한다', async () => {
    const response = toErrorResponse(
      new ApiError({ message: '권한 없음', category: 'auth', status: 403, code: 'AUTH_002' }),
    );

    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({ message: '권한 없음', code: 'AUTH_002' });
  });

  it('백엔드 연결 실패는 502와 코드로 구분한다', async () => {
    const response = toErrorResponse(new ApiError({ message: 'timeout', category: 'network' }));

    expect(response.status).toBe(502);
    expect(await response.json()).toEqual({
      message: '서버에 연결하지 못했습니다.',
      code: 'BFF_UPSTREAM_UNAVAILABLE',
    });
  });

  it('그 외 오류는 내부 메시지 없이 500', async () => {
    const response = toErrorResponse(new Error('db password leaked'));

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ message: 'Internal Server Error' });
  });
});
