import assert from 'node:assert/strict';
import { test } from 'node:test';
import vm from 'node:vm';
import {
  buildTabBarInsetScript,
  getTabBarLayout,
  indexAtOffset,
  pillOffsetAt,
  shouldUseNativeTabBar,
} from './native-tab-bar.ts';

test('iOS이고 글라스를 쓸 수 있을 때만 네이티브 막대를 쓴다', () => {
  assert.equal(shouldUseNativeTabBar('ios', true), true);
  assert.equal(shouldUseNativeTabBar('ios', false), false);
  assert.equal(shouldUseNativeTabBar('android', true), false);
  assert.equal(shouldUseNativeTabBar('web', true), false);
});

test('홈 인디케이터 여백이 있으면 그보다 조금 낮게, 없으면 최소 여백을 둔다', () => {
  assert.deepEqual(getTabBarLayout(34), { bottom: 26, height: 64, inset: 98 });
  assert.deepEqual(getTabBarLayout(0), { bottom: 8, height: 64, inset: 80 });
  assert.deepEqual(getTabBarLayout(Number.NaN), { bottom: 8, height: 64, inset: 80 });
});

test('막대 높이를 CSS 변수로 넣고 음수·NaN은 0으로 막는다', () => {
  const run = (inset) => {
    const style = new Map();
    vm.runInNewContext(buildTabBarInsetScript(inset), {
      document: { documentElement: { style: { setProperty: (k, v) => style.set(k, v) } } },
    });
    return Object.fromEntries(style);
  };

  assert.deepEqual(run(97.6), { '--native-tab-bar-inset': '98px' });
  assert.deepEqual(run(-5), { '--native-tab-bar-inset': '0px' });
  assert.deepEqual(run(Number.NaN), { '--native-tab-bar-inset': '0px' });
});

test('x 좌표를 항목 번호로 바꾸고 막대 밖은 끝 항목으로 제한한다', () => {
  assert.equal(indexAtOffset(0, 100, 4), 0);
  assert.equal(indexAtOffset(250, 100, 4), 2);
  assert.equal(indexAtOffset(-30, 100, 4), 0);
  assert.equal(indexAtOffset(999, 100, 4), 3);
  assert.equal(indexAtOffset(50, 0, 4), 0);
});

test('끄는 동안 알약은 손가락 아래 가운데에 오되 막대 안으로 제한된다', () => {
  assert.equal(pillOffsetAt(210, 100, 400), 160);
  assert.equal(pillOffsetAt(10, 100, 400), 0);
  assert.equal(pillOffsetAt(399, 100, 400), 300);
});
