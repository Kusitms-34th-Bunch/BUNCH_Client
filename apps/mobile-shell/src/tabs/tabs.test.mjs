import assert from 'node:assert/strict';
import { test } from 'node:test';
import { canShowTabs, tabUrl } from './tabs.ts';

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
