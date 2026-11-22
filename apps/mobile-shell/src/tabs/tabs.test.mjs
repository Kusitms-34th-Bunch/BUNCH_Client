import assert from 'node:assert/strict';
import { test } from 'node:test';
import { canShowTabs, isTabRootUrl, tabUrl, visibleTabAt, visibleTabIndex } from './tabs.ts';

const WEB = 'http://localhost:3000';
const item = (id, path = `/${id}`) => ({ id, label: id, path });

test('쉘에 탭 화면이 있는 항목만 받아들인다', () => {
  assert.equal(canShowTabs({ items: [item('feed'), item('my')], selectedId: 'feed' }, WEB), true);
  assert.equal(
    canShowTabs({ items: [item('feed'), item('search')], selectedId: 'feed' }, WEB),
    false,
  );
});

test('선택 탭이 항목에 없으면 받아들이지 않는다', () => {
  assert.equal(
    canShowTabs({ items: [item('feed'), item('my')], selectedId: 'photos' }, WEB),
    false,
  );
});

test('탭 경로가 다른 출처로 풀리면 받아들이지 않는다', () => {
  for (const path of ['/\t/evil.test', '/\n/evil.test', '//evil.test']) {
    assert.equal(
      canShowTabs({ items: [item('feed', path), item('my')], selectedId: 'feed' }, WEB),
      false,
      path,
    );
  }
});

test('탭 주소는 웹 기본 주소의 출처에 탭 경로를 붙인다', () => {
  assert.equal(tabUrl(WEB, '/feed'), 'http://localhost:3000/feed');
  assert.equal(tabUrl('https://bunch.example.com/app', '/my'), 'https://bunch.example.com/my');
});

test('꾹 누른 탭 순서는 숨긴 탭을 뺀 탭 바 순서로 바꾼다', () => {
  const all = [{ id: 'feed' }, { id: 'photos' }, { id: 'bunch' }, { id: 'my' }];
  assert.equal(visibleTabAt(all, 2), 'bunch');
  // 사진함이 숨겨지면 세 번째 칸은 마이
  assert.equal(visibleTabAt([{ id: 'feed' }, { id: 'bunch' }, { id: 'my' }], 2), 'my');
  assert.equal(visibleTabAt(all, 4), undefined);
  // 반대 방향: 꾹 누르기를 받을 탭의 순서를 네이티브에 알림
  assert.equal(visibleTabIndex([{ id: 'feed' }, { id: 'bunch' }, { id: 'my' }], 'bunch'), 1);
  assert.equal(visibleTabIndex([{ id: 'feed' }, { id: 'my' }], 'bunch'), -1);
});

test('탭 첫 화면 주소인지는 경로만 보고 하위 화면은 아니다', () => {
  assert.equal(isTabRootUrl('http://localhost:3000/bunch', '/bunch'), true);
  assert.equal(isTabRootUrl('http://localhost:3000/bunch/?tab=drafts#x', '/bunch'), true);
  assert.equal(isTabRootUrl('http://localhost:3000/bunch/bundles/new/members', '/bunch'), false);
  assert.equal(isTabRootUrl('주소 아님', '/bunch'), false);
});
