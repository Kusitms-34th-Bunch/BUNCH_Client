import assert from 'node:assert/strict';
import { test } from 'node:test';
import { blocksBackNavigation, isAppWebUrl, resolveWebUrl } from './web-url.ts';

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

test('E2E 빌드만 Release에서 같은 기기의 http 웹(localhost·127.0.0.1)을 받는다', () => {
  assert.equal(resolveWebUrl(false, '', 'http://127.0.0.1:3200', true), 'http://127.0.0.1:3200');
  assert.equal(resolveWebUrl(false, '', 'http://localhost:3200', true), 'http://localhost:3200');
  // E2E 빌드라도 다른 http 주소는 거절, 플래그가 없으면 루프백도 거절
  assert.throws(() => resolveWebUrl(false, '', 'http://bunch.example.com', true), /HTTPS/);
  assert.throws(() => resolveWebUrl(false, '', 'http://192.168.0.2:3200', true), /HTTPS/);
  assert.throws(() => resolveWebUrl(false, '', 'http://127.0.0.1:3200'), /HTTPS/);
  // 앱 런타임 URL 해석기가 루프백으로 잘못 읽는 형태도 거절
  for (const tricky of [
    'http://evil.com?@127.0.0.1:3200',
    'http://evil.com#@localhost',
    'http://localhost.evil.com',
    'http://127.0.0.1\\@evil.com',
    'http://127.0.0.1\t.evil.com',
    'http://%31%32%37.0.0.1',
    'http://user@127.0.0.1',
    'HTTP://127.0.0.1:3200',
  ]) {
    assert.throws(() => resolveWebUrl(false, '', tricky, true), /HTTPS/, tricky);
  }
});

test('앱 출처의 경로만 WebView에 허용한다', () => {
  const appUrl = 'https://bunch.example.com';
  assert.equal(isAppWebUrl(`${appUrl}/onboarding`, appUrl), true);
  for (const value of [
    'https://other.example.com',
    'https://bunch.example.com.evil.test',
    'https://bunch.example.com@evil.test',
    'http://bunch.example.com',
    'https://bunch.example.com:444',
    'about:blank',
    'file:///page.html',
    'invalid',
  ]) {
    assert.equal(isAppWebUrl(value, appUrl), false, value);
  }
});

test('로컬 앱 출처도 프로토콜·호스트·포트가 일치해야 한다', () => {
  const appUrl = 'http://localhost:3000';
  assert.equal(isAppWebUrl(`${appUrl}/onboarding`, appUrl), true);
  assert.equal(isAppWebUrl('http://localhost:3001', appUrl), false);
});

test('로그인·인트로 화면에서만 뒤로 가기로 웹 기록을 되돌리지 않는다(앱 출처일 때만)', () => {
  const app = 'https://app.example.com';
  assert.equal(blocksBackNavigation(`${app}/login`, app), true);
  assert.equal(blocksBackNavigation(`${app}/intro?from=x`, app), true);
  assert.equal(blocksBackNavigation(`${app}/bunch`, app), false);
  assert.equal(blocksBackNavigation(`${app}/login/terms`, app), false);
  assert.equal(blocksBackNavigation('https://other.example.com/login', app), false);
  assert.equal(blocksBackNavigation('not a url', app), false);
});
