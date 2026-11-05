// @vitest-environment node

import { NextRequest } from 'next/server';
import { describe, expect, it } from 'vitest';
import { config, proxy } from './proxy';

const request = (method: string, fetchSite?: string) =>
  new NextRequest('https://app.example.com/api/bunches', {
    method,
    headers: fetchSite ? { 'sec-fetch-site': fetchSite } : {},
  });

describe('proxy(BFF CSRF 검사)', () => {
  it('다른 사이트·형제 서브도메인의 상태 변경 요청은 403', async () => {
    for (const fetchSite of ['cross-site', 'same-site']) {
      const response = proxy(request('POST', fetchSite));
      expect(response.status).toBe(403);
      expect(await response.json()).toMatchObject({ code: 'BFF_CROSS_SITE' });
    }
  });

  it('같은 출처 요청, 헤더 없는 요청, 다른 사이트의 GET은 통과한다', () => {
    for (const [method, fetchSite] of [
      ['POST', 'same-origin'],
      ['POST', undefined],
      ['GET', 'cross-site'],
    ] as const) {
      expect(proxy(request(method, fetchSite)).headers.get('x-middleware-next')).toBe('1');
    }
  });

  it('BFF 경로에만 적용한다', () => {
    expect(config.matcher).toBe('/api/:path*');
  });
});
