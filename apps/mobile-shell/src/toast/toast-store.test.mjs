import assert from 'node:assert/strict';
import { test } from 'node:test';
import { toastStore } from './toast-store.ts';

const toast = (id) => ({ id, message: `토스트 ${id}`, duration: 3000, fullWidth: true });

test('탭마다 토스트 하나를 두고 새 토스트가 대체한다', () => {
  toastStore.clear();
  toastStore.show('bunch', toast('a'));
  toastStore.show('photos', toast('b'));
  toastStore.show('bunch', toast('c'));
  assert.equal(toastStore.get().bunch?.id, 'c');
  assert.equal(toastStore.get().photos?.id, 'b');
});

test('자동 닫힘은 그 토스트일 때만 지운다', () => {
  toastStore.clear();
  toastStore.show('bunch', toast('a'));
  toastStore.show('bunch', toast('b'));
  toastStore.hide('bunch', 'a');
  assert.equal(toastStore.get().bunch?.id, 'b');
  toastStore.hide('bunch', 'b');
  assert.equal(toastStore.get().bunch, undefined);
});

test('id 없이 닫으면 지금 토스트를 지우고, clear는 모든 탭을 지운다', () => {
  toastStore.clear();
  toastStore.show('bunch', toast('a'));
  toastStore.show('photos', toast('b'));
  toastStore.hide('bunch');
  assert.equal(toastStore.get().bunch, undefined);
  toastStore.clear();
  assert.deepEqual(toastStore.get(), {});
});

test('바뀔 때만 구독자에게 알린다', () => {
  toastStore.clear();
  let calls = 0;
  const unsubscribe = toastStore.subscribe(() => {
    calls += 1;
  });
  toastStore.hide('bunch');
  toastStore.show('bunch', toast('a'));
  toastStore.hide('bunch', 'other');
  unsubscribe();
  assert.equal(calls, 1);
});
