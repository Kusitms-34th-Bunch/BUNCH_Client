import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { test } from 'node:test';
import vm from 'node:vm';
import { indexAtOffset, pillOffsetAt } from './native-tab-bar.ts';

const require = createRequire(new URL('../../package.json', import.meta.url));
const ts = require('typescript');

function createGesture() {
  const slots = [];
  let cursor = 0;
  const effects = [];
  const timings = [];
  let motionListener;
  let resolveInitialMotion;
  let removed = false;
  let handlers;
  const initialMotion = new Promise((resolve) => (resolveInitialMotion = resolve));
  class Value {
    constructor(value) {
      this.value = value;
      this.stopped = 0;
    }
    setValue(value) {
      this.value = value;
    }
    stopAnimation() {
      this.stopped += 1;
    }
  }
  const React = {
    useRef(initial) {
      const index = cursor++;
      return (slots[index] ??= { current: initial });
    },
    useState(initial) {
      const index = cursor++;
      if (!(index in slots)) slots[index] = initial;
      return [
        slots[index],
        (value) => (slots[index] = typeof value === 'function' ? value(slots[index]) : value),
      ];
    },
    useEffect(effect) {
      const index = cursor++;
      if (!(index in slots)) {
        slots[index] = true;
        effects.push(effect);
      }
    },
  };
  const native = {
    AccessibilityInfo: {
      isReduceMotionEnabled: () => initialMotion,
      addEventListener: (_name, listener) => {
        motionListener = listener;
        return { remove: () => (removed = true) };
      },
    },
    Animated: {
      Value,
      timing: (value, config) => ({
        start: () => {
          timings.push(config);
          value.setValue(config.toValue);
        },
      }),
      sequence: (animations) => ({
        start: () => animations.forEach((animation) => animation.start()),
      }),
    },
    Easing: { ease: () => {}, inOut: (value) => value },
    PanResponder: {
      create: (value) => {
        handlers = value;
        return { panHandlers: value };
      },
    },
  };
  const source = readFileSync(new URL('./useNativeTabBarGesture.ts', import.meta.url), 'utf8');
  const code = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS },
  }).outputText;
  const exports = {};
  vm.runInNewContext(code, {
    exports,
    require: (name) =>
      name === 'react' ? React : name === 'react-native' ? native : { indexAtOffset, pillOffsetAt },
    setTimeout,
    clearTimeout,
  });
  const params = { items: [{ id: 'a' }, { id: 'b' }], selectedIndex: 0, onSelect: () => {} };
  const render = () => {
    cursor = 0;
    const result = exports.useNativeTabBarGesture(params);
    const cleanup = effects
      .splice(0)
      .map((effect) => effect())
      .filter(Boolean);
    return { ...result, cleanup };
  };
  return {
    render,
    handlers: () => handlers,
    timings,
    motion: (value) => motionListener(value),
    resolveInitialMotion,
    removed: () => removed,
  };
}

test('모션 감소 설정이 바뀌면 진행 중인 모션과 제스처 종료 모션을 줄인다', async () => {
  const gesture = createGesture();
  const first = gesture.render();
  gesture.resolveInitialMotion(false);
  await Promise.resolve();
  first.rowProps.onLayout({ nativeEvent: { layout: { width: 200, height: 60 } } });
  const view = gesture.render();
  const pan = gesture.handlers();
  pan.onPanResponderGrant({ nativeEvent: { pageX: 10 } });
  assert.ok(gesture.timings.length > 0);
  gesture.motion(true);
  assert.equal(view.pillScale.value, 1);
  assert.ok(view.pillScale.stopped > 0);
  assert.ok(view.pillX.stopped > 0);
  gesture.timings.length = 0;
  pan.onPanResponderMove({ nativeEvent: { pageX: 30 } });
  pan.onPanResponderRelease({ nativeEvent: { pageX: 30 } });
  assert.equal(view.pillX.value, 0);
  pan.onPanResponderTerminate();
  assert.equal(gesture.timings.length, 0);
  gesture.motion(false);
  pan.onPanResponderGrant({ nativeEvent: { pageX: 10 } });
  assert.ok(gesture.timings.length > 0);
  first.cleanup.forEach((cleanup) => cleanup());
  assert.equal(gesture.removed(), true);
});

test('초기 설정 조회가 늦게 끝나도 이후 설정 변경을 덮어쓰지 않는다', async () => {
  const gesture = createGesture();
  const first = gesture.render();
  first.rowProps.onLayout({ nativeEvent: { layout: { width: 200, height: 60 } } });
  gesture.render();
  gesture.motion(true);
  gesture.resolveInitialMotion(false);
  await Promise.resolve();
  gesture.handlers().onPanResponderGrant({ nativeEvent: { pageX: 10 } });
  assert.equal(gesture.timings.length, 0);
  first.cleanup.forEach((cleanup) => cleanup());
});
