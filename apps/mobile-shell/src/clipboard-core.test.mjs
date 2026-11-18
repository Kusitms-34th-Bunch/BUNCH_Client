import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createClipboardBridge } from './clipboard-core.ts';

const setup = ({ stored = '', setFails = false, getFails = false } = {}) => {
  const state = { stored, writes: [] };
  const bridge = createClipboardBridge({
    // 계약(clipboardTextSchema)과 같은 규칙: 1~2048자
    isValidText: (text) => text.length >= 1 && text.length <= 2048,
    setString: (text) => {
      if (setFails) return Promise.reject(new Error('denied'));
      state.writes.push(text);
      return Promise.resolve(true);
    },
    getString: () =>
      getFails ? Promise.reject(new Error('denied')) : Promise.resolve(state.stored),
  });
  return { bridge, state };
};

test('복사는 문자열을 클립보드에 쓰고 true를 돌려준다', async () => {
  const { bridge, state } = setup();

  assert.equal(await bridge.copyToClipboard('https://app.bunch.kr/invite/abc'), true);
  assert.deepEqual(state.writes, ['https://app.bunch.kr/invite/abc']);
});

test('빈 문자열과 상한(2048자)을 넘는 문자열은 쓰지 않고 false다', async () => {
  const { bridge, state } = setup();

  assert.equal(await bridge.copyToClipboard(''), false);
  assert.equal(await bridge.copyToClipboard('a'.repeat(2049)), false);
  assert.equal(await bridge.copyToClipboard('a'.repeat(2048)), true);
  assert.equal(state.writes.length, 1);
});

test('복사 중 오류는 던지지 않고 false다', async () => {
  const { bridge } = setup({ setFails: true });

  assert.equal(await bridge.copyToClipboard('text'), false);
});

test('읽기는 앞뒤 공백을 지운 텍스트를 돌려준다', async () => {
  const { bridge } = setup({ stored: '  https://app.bunch.kr/invite/abc \t\n' });

  assert.equal(await bridge.readClipboard(), 'https://app.bunch.kr/invite/abc');
});

test('비어 있거나 상한을 넘는 클립보드는 null이다', async () => {
  assert.equal(await setup({ stored: '' }).bridge.readClipboard(), null);
  assert.equal(await setup({ stored: '   ' }).bridge.readClipboard(), null);
  assert.equal(await setup({ stored: 'a'.repeat(2049) }).bridge.readClipboard(), null);
});

test('읽기 중 오류는 던지지 않고 null이다', async () => {
  const { bridge } = setup({ getFails: true });

  assert.equal(await bridge.readClipboard(), null);
});
