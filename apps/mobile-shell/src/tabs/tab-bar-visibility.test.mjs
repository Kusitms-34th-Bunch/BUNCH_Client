import assert from 'node:assert/strict';
import { test } from 'node:test';
import { focusTabBar, reportTabBar } from './tab-bar-visibility.ts';

test('지금 탭이 알려 온 값은 탭 바에 바로 적용한다', () => {
  const state = reportTabBar({ focusedTab: 'bunch' }, 'bunch', false, 'feed');
  assert.equal(state.barHidden, true);
  assert.deepEqual(state.hiddenByTab, { bunch: true });
});

test('뒤에 있는 탭이 보낸 값은 저장만 하고 지금 탭 바는 바꾸지 않는다', () => {
  // 콕한 장소(번치 탭)를 보는 중에 뒤의 피드 탭이 「보임」을 보냄
  const onPlaces = reportTabBar({ focusedTab: 'bunch' }, 'bunch', false, 'feed');
  const state = reportTabBar(onPlaces, 'feed', true, 'feed');
  assert.equal(state.barHidden, true);
  assert.deepEqual(state.hiddenByTab, { bunch: true, feed: false });
});

test('탭이 바뀌면 그 탭이 마지막으로 알려 온 값으로 맞춘다', () => {
  // 콕한 장소에서 「피드 둘러보기」로 피드 탭으로 감
  let state = reportTabBar({ focusedTab: 'feed' }, 'feed', true, 'feed');
  state = focusTabBar(state, 'bunch');
  state = reportTabBar(state, 'bunch', false, 'feed');
  assert.equal(state.barHidden, true);

  state = focusTabBar(state, 'feed');
  assert.equal(state.barHidden, false);
  state = focusTabBar(state, 'bunch');
  assert.equal(state.barHidden, true);
});

test('알려 온 적 없는 탭으로 바뀌면 탭 바를 보이고, 지금 탭을 모르면 처음 고른 탭으로 본다', () => {
  const hidden = reportTabBar({}, 'feed', false, 'feed');
  assert.equal(hidden.barHidden, true);
  assert.equal(focusTabBar(hidden, 'my').barHidden, false);
});

test('값이 같으면 같은 상태를 돌려줘 다시 그리지 않는다', () => {
  const state = reportTabBar({ focusedTab: 'feed' }, 'feed', true, 'feed');
  assert.equal(reportTabBar(state, 'feed', true, 'feed'), state);
  const focused = focusTabBar(state, 'feed');
  assert.equal(focusTabBar(focused, 'feed'), focused);
});
