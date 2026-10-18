import assert from 'node:assert/strict';
import { test } from 'node:test';
import vm from 'node:vm';
import { buildSafeAreaScript } from './safe-area-script.ts';

const run = (script, { documentElement = { style: new Map() } } = {}) => {
  const style = documentElement?.style;
  const listeners = {};
  const document = {
    documentElement: documentElement && {
      style: { setProperty: (key, value) => style.set(key, value) },
    },
    addEventListener: (type, listener) => (listeners[type] = listener),
  };
  vm.runInNewContext(script, { document });
  return { style, listeners };
};

test('네 방향 값을 CSS 변수로 넣는다', () => {
  const { style } = run(buildSafeAreaScript({ top: 47, bottom: 34, left: 0, right: 0 }));

  assert.deepEqual(Object.fromEntries(style), {
    '--native-safe-area-top': '47px',
    '--native-safe-area-bottom': '34px',
    '--native-safe-area-left': '0px',
    '--native-safe-area-right': '0px',
  });
});

test('소수는 반올림하고 음수·NaN은 0으로 막는다', () => {
  const { style } = run(
    buildSafeAreaScript({ top: 47.6, bottom: -3, left: Number.NaN, right: Infinity }),
  );

  assert.equal(style.get('--native-safe-area-top'), '48px');
  assert.equal(style.get('--native-safe-area-bottom'), '0px');
  assert.equal(style.get('--native-safe-area-left'), '0px');
  assert.equal(style.get('--native-safe-area-right'), '0px');
});

test('documentElement가 아직 없으면 문서가 준비된 뒤에 적용하고, 그때도 없으면 오류 없이 넘어간다', () => {
  const style = new Map();
  const listeners = {};
  const document = {
    documentElement: null,
    addEventListener: (type, listener) => (listeners[type] = listener),
  };
  vm.runInNewContext(buildSafeAreaScript({ top: 10, bottom: 20, left: 0, right: 0 }), { document });

  assert.equal(style.size, 0);
  assert.equal(typeof listeners.readystatechange, 'function');
  assert.doesNotThrow(() => listeners.readystatechange());

  document.documentElement = { style: { setProperty: (key, value) => style.set(key, value) } };
  listeners.readystatechange();

  assert.equal(style.get('--native-safe-area-top'), '10px');
});
