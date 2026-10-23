import assert from 'node:assert/strict';
import { test } from 'node:test';
import { galleryImageSchema, setNativeTabBarParamsSchema } from './schema.ts';

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
