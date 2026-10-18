import assert from 'node:assert/strict';
import { test } from 'node:test';
import { resolveWebUrl } from './web-url.ts';

test('개발 앱은 로컬 주소, Release 앱은 운영 주소를 선택한다', () => {
  const local = 'http://localhost:3000';
  const production = 'https://bunch.example.com';
  assert.equal(resolveWebUrl(true, local, production), local);
  assert.equal(resolveWebUrl(false, local, production), production);
});

test('선택한 환경의 주소가 없으면 다른 환경으로 대체하지 않는다', () => {
  assert.throws(
    () => resolveWebUrl(true, '', 'https://bunch.example.com'),
    /EXPO_PUBLIC_DEV_WEB_URL/,
  );
  assert.throws(() => resolveWebUrl(false, 'http://localhost:3000', ''), /EXPO_PUBLIC_WEB_URL/);
});

test('Release는 HTTPS만 허용하고 개발 주소도 웹 프로토콜이어야 한다', () => {
  assert.throws(() => resolveWebUrl(false, '', 'http://localhost:3000'), /HTTPS/);
  assert.throws(() => resolveWebUrl(true, 'file:///tmp/page.html'), /HTTP/);
  assert.throws(() => resolveWebUrl(true, 'invalid'), /EXPO_PUBLIC_DEV_WEB_URL/);
});
