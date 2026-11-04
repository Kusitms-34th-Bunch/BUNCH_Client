import { describe, expect, it } from 'vitest';
import { isSafeImageUrl } from './safeImageUrl';

describe('isSafeImageUrl', () => {
  it.each(['https://cdn.example/1.jpg', '/mock/photos/S1.jpg', '/img/1.jpg'])(
    '%s는 허용한다',
    (url) => expect(isSafeImageUrl(url)).toBe(true),
  );

  it.each([
    '',
    'javascript:alert(1)',
    'data:image/svg+xml;base64,AAAA',
    'http://insecure.example/x.jpg',
    '//evil.example/x.jpg',
    '/\\evil.example/x.jpg',
    '/a b.jpg',
    'https://a b',
  ])('%s는 거부한다', (url) => expect(isSafeImageUrl(url)).toBe(false));
});
