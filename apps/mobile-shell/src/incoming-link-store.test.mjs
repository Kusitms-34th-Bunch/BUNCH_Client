import assert from 'node:assert/strict';
import { test } from 'node:test';
import { incomingLinkStore } from './incoming-link-store.ts';

test('받은 링크를 알리고, 연 값만 비운다', () => {
  let notified = 0;
  const unsubscribe = incomingLinkStore.subscribe(() => {
    notified += 1;
  });
  incomingLinkStore.set('/invite/AAAA1111', 1000);
  assert.equal(notified, 1);
  assert.equal(incomingLinkStore.get(1000), '/invite/AAAA1111');

  // 여는 사이 새 링크가 들어오면 이전 값을 비우는 요청은 무시
  incomingLinkStore.set('/invite/BBBB2222', 1000);
  incomingLinkStore.clear('/invite/AAAA1111');
  assert.equal(incomingLinkStore.get(1000), '/invite/BBBB2222');

  incomingLinkStore.clear('/invite/BBBB2222');
  assert.equal(incomingLinkStore.get(1000), null);
  unsubscribe();
});

test('열지 못한 링크는 10초가 지나면 버린다(나중에 첫 화면이 생겨도 열리지 않게)', () => {
  incomingLinkStore.set('/invite/CCCC3333', 0);
  assert.equal(incomingLinkStore.get(10_000), '/invite/CCCC3333');
  assert.equal(incomingLinkStore.get(10_001), null);
  incomingLinkStore.clear('/invite/CCCC3333');
});
