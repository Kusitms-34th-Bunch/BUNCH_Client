// @vitest-environment node

import { NextRequest } from 'next/server';
import { describe, expect, it } from 'vitest';
import { GET } from './route';

const get = (query: string) =>
  GET(new NextRequest(`https://app.example.com/api/app-version${query}`));

describe('GET /api/app-version', () => {
  it('앱 버전으로 업데이트 필요 여부를 1분 캐시로 돌려준다', async () => {
    const response = get('?version=0.9.0&build=1');
    expect(response.status).toBe(200);
    expect(response.headers.get('Cache-Control')).toBe('public, max-age=60');
    expect(await response.json()).toEqual({ updateRequired: true });
    expect(await get('?version=99.0.0&build=1').json()).toEqual({ updateRequired: false });
    expect(await get('?version=legacy').json()).toEqual({ updateRequired: false });
  });

  it('형식이 다른 입력은 400으로 거절한다', () => {
    for (const query of ['', '?version=1.2.0', '?version=1.2.0&build=abc', '?version=x&build=1']) {
      expect(get(query).status).toBe(400);
    }
  });
});
