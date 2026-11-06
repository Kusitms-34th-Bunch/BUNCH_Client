import assert from 'node:assert/strict';
import { test } from 'node:test';
import { fitLongEdge } from './gallery-resize.ts';

test('긴 변이 상한 이하이면 줄이지 않는다', () => {
  assert.equal(fitLongEdge(2048, 1536), null);
  assert.equal(fitLongEdge(800, 600), null);
});

test('긴 변만 상한으로 줄인다(가로·세로)', () => {
  assert.deepEqual(fitLongEdge(4032, 3024), { width: 2048 });
  assert.deepEqual(fitLongEdge(3024, 4032), { height: 2048 });
  assert.deepEqual(fitLongEdge(3000, 3000), { width: 2048 });
});
