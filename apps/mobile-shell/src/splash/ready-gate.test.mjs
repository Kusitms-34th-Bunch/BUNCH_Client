import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createReadyGate } from './ready-gate.ts';

test('첫 신호에 한 번만 닫는다', () => {
  let count = 0;
  const gate = createReadyGate(() => (count += 1));
  gate.ready();
  gate.ready();
  gate.force();
  assert.equal(count, 1);
});

test('탭 화면으로 넘어가는 중에는 첫 화면 WebView의 신호를 무시하고, 탭 WebView가 불러오기 시작한 뒤 신호로 닫는다', () => {
  let count = 0;
  const gate = createReadyGate(() => (count += 1));
  gate.waitForTabs();
  gate.ready();
  assert.equal(count, 0);
  gate.tabLoading();
  gate.ready();
  assert.equal(count, 1);
});

test('탭 화면으로 넘어가는 중이어도 안전장치·로드 실패는 닫는다', () => {
  let count = 0;
  const gate = createReadyGate(() => (count += 1));
  gate.waitForTabs();
  gate.force();
  assert.equal(count, 1);
});

test('이미 닫힌 뒤 탭 화면으로 넘어가도 다시 막지 않는다', () => {
  let count = 0;
  const gate = createReadyGate(() => (count += 1));
  gate.ready();
  gate.waitForTabs();
  gate.ready();
  assert.equal(count, 1);
});
