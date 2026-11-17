// @vitest-environment node

import { describe, expect, it } from 'vitest';
import { createRateLimiter } from './rateLimit';

const options = { limit: 3, windowMs: 1000, maxKeys: 4 };

describe('createRateLimiter', () => {
  it('한 창 안에서 한도까지 허용하고 넘으면 남은 초를 돌려준다', () => {
    const limiter = createRateLimiter(options);

    expect(limiter.check('a', 0)).toBeUndefined();
    expect(limiter.check('a', 100)).toBeUndefined();
    expect(limiter.check('a', 200)).toBeUndefined();
    // 창은 처음 요청(0ms)부터 1000ms, 400ms 시점에서 남은 시간은 0.6초라 올림해 1초
    expect(limiter.check('a', 400)).toBe(1);
  });

  it('창이 지나면 다시 센다', () => {
    const limiter = createRateLimiter(options);
    for (const at of [0, 1, 2]) limiter.check('a', at);
    expect(limiter.check('a', 3)).toBeDefined();

    expect(limiter.check('a', 1000)).toBeUndefined();
  });

  it('키마다 따로 센다', () => {
    const limiter = createRateLimiter(options);
    for (const at of [0, 1, 2]) limiter.check('a', at);

    expect(limiter.check('a', 3)).toBeDefined();
    expect(limiter.check('b', 3)).toBeUndefined();
  });

  it('가득 찬 채로 새 키가 들어오면 만료된 키를 먼저 비워 살아 있는 키의 횟수는 지킨다', () => {
    const limiter = createRateLimiter(options);
    // c가 가장 먼저 들어온 키. a·b는 1000ms에 만료되고, c는 만료 뒤 다시 들어와 새 창으로 살아 있음
    for (const key of ['c', 'a', 'b']) limiter.check(key, 0);
    for (const at of [1200, 1201, 1202]) limiter.check('c', at);
    expect(limiter.check('c', 1203)).toBeDefined();
    // 키가 상한(4)에 찬 뒤 새 키가 들어옴: 오래된 순으로만 밀어내면 살아 있는 c가 먼저 지워짐
    limiter.check('d', 1300);
    limiter.check('e', 1500);

    expect(limiter.check('c', 1501)).toBeDefined();
  });

  it('키 수가 상한을 넘으면 오래된 키부터 비워 메모리가 늘지 않는다', () => {
    const limiter = createRateLimiter(options);
    for (const key of ['a', 'b', 'c', 'd']) limiter.check(key, 0);
    for (const at of [1, 2]) limiter.check('a', at);
    expect(limiter.check('a', 3)).toBeDefined();

    // 새 키가 들어오면 가장 먼저 들어온 a가 밀려나 다시 처음부터 셈
    limiter.check('e', 4);
    expect(limiter.check('a', 5)).toBeUndefined();
  });
});
