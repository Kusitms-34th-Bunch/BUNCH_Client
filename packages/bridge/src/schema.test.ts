import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  clipboardTextSchema,
  galleryImageSchema,
  pickGalleryImageOptionsSchema,
  setNativeTabBarParamsSchema,
  socialLoginResultSchema,
  socialProviderSchema,
} from './schema.ts';

void test('소셜 서비스는 카카오·Google·Apple만 허용한다', () => {
  for (const provider of ['kakao', 'google', 'apple']) {
    assert.equal(socialProviderSchema.safeParse(provider).success, true, provider);
  }
  assert.equal(socialProviderSchema.safeParse('naver').success, false);
});

void test('소셜 로그인 성공은 ID 토큰이 필요하고 카카오·Apple은 nonce도 필요하다', () => {
  const parse = (value: unknown) => socialLoginResultSchema.safeParse(value).success;
  assert.equal(parse({ status: 'success', provider: 'google', idToken: 'token' }), true);
  assert.equal(
    parse({ status: 'success', provider: 'kakao', idToken: 'token', nonce: 'nonce' }),
    true,
  );
  assert.equal(parse({ status: 'success', provider: 'kakao', idToken: 'token' }), false);
  assert.equal(parse({ status: 'success', provider: 'apple', idToken: 'token' }), false);
  assert.equal(parse({ status: 'success', provider: 'google', idToken: '' }), false);
  assert.equal(parse({ status: 'success', provider: 'naver', idToken: 'token' }), false);
});

void test('소셜 로그인 취소는 별도 결과이며 토큰을 싣지 않는다', () => {
  assert.equal(socialLoginResultSchema.safeParse({ status: 'cancelled' }).success, true);
  assert.equal(socialLoginResultSchema.safeParse({ status: 'failed' }).success, false);
});

void test('네이티브 탭 ID는 서로 달라야 한다', () => {
  const items = [
    { id: 'home', label: '홈', path: '/home' },
    { id: 'search', label: '검색', path: '/search' },
  ];
  assert.equal(setNativeTabBarParamsSchema.safeParse({ items, selectedId: 'home' }).success, true);
  assert.equal(
    setNativeTabBarParamsSchema.safeParse({
      items: [items[0], { ...items[1], id: 'home' }],
      selectedId: 'home',
    }).success,
    false,
  );
});

void test('탭 경로는 같은 출처의 절대 경로만 허용한다', () => {
  const tab = (path: string) => ({
    items: [
      { id: 'home', label: '홈', path },
      { id: 'search', label: '검색', path: '/search' },
    ],
    selectedId: 'home',
  });
  assert.equal(setNativeTabBarParamsSchema.safeParse(tab('/feed')).success, true);
  for (const path of [
    'feed',
    '//evil.test',
    '/\\evil.test',
    'https://evil.test/feed',
    '/\t/evil.test',
    '/\n/evil.test',
  ]) {
    assert.equal(setNativeTabBarParamsSchema.safeParse(tab(path)).success, false, path);
  }
});

void test('갤러리 미리보기는 크기가 제한된 JPEG data URL만 허용한다', () => {
  assert.equal(
    galleryImageSchema.safeParse({ dataUrl: 'data:image/jpeg;base64,YWJj' }).success,
    true,
  );
  for (const dataUrl of [
    'file:///photo.jpg',
    'javascript:alert(1)',
    'data:image/svg+xml;base64,YWJj',
    'data:image/jpeg;base64,',
    `data:image/jpeg;base64,${'A'.repeat(4 * 1024 * 1024)}`,
  ]) {
    assert.equal(galleryImageSchema.safeParse({ dataUrl }).success, false);
  }
});

void test('갤러리 선택 옵션은 edit 불리언만 허용하고 생략할 수 있다', () => {
  assert.equal(pickGalleryImageOptionsSchema.safeParse(undefined).success, true);
  assert.equal(pickGalleryImageOptionsSchema.safeParse({}).success, true);
  assert.equal(pickGalleryImageOptionsSchema.safeParse({ edit: false }).success, true);
  assert.equal(pickGalleryImageOptionsSchema.safeParse({ edit: 'no' }).success, false);
  assert.equal(pickGalleryImageOptionsSchema.safeParse({ edit: false, extra: 1 }).success, false);
});

void test('클립보드 텍스트는 1~2048자 문자열만 허용한다', () => {
  const parse = (value: unknown) => clipboardTextSchema.safeParse(value).success;
  assert.equal(parse('https://app.bunch.kr/invite/abc'), true);
  assert.equal(parse('a'.repeat(2048)), true);
  assert.equal(parse(''), false);
  assert.equal(parse('a'.repeat(2049)), false);
  assert.equal(parse(123), false);
  assert.equal(parse(null), false);
});
