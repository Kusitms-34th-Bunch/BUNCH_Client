import assert from 'node:assert/strict';
import { test } from 'node:test';
import { galleryImageSchema, setNativeTabBarParamsSchema } from './schema.ts';

void test('네이티브 탭 ID는 서로 달라야 한다', () => {
  const items = [
    { id: 'home', label: '홈' },
    { id: 'search', label: '검색' },
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
