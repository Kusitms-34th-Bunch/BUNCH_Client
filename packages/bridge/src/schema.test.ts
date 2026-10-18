import assert from 'node:assert/strict';
import { test } from 'node:test';
import { setNativeTabBarParamsSchema } from './schema.ts';

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
