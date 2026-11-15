import { beforeEach, describe, expect, it, vi } from 'vitest';
import { pickIntents } from './pickIntents';

beforeEach(() => {
  pickIntents.reset();
});

describe('pickIntents', () => {
  it('번들·사진별 희망 상태를 두고 바뀔 때마다 구독자에게 알린다', () => {
    const listener = vi.fn();
    const unsubscribe = pickIntents.subscribe(listener);

    pickIntents.set('b1', 'p1', true);
    pickIntents.set('b2', 'p1', false);

    expect(pickIntents.get('b1', 'p1')).toBe(true);
    expect(pickIntents.get('b2', 'p1')).toBe(false);
    expect(pickIntents.getSnapshot()).toEqual({
      [pickIntents.keyOf('b1', 'p1')]: true,
      [pickIntents.keyOf('b2', 'p1')]: false,
    });
    expect(listener).toHaveBeenCalledTimes(2);

    unsubscribe();
    pickIntents.set('b1', 'p2', true);
    expect(listener).toHaveBeenCalledTimes(2);
  });

  it('없는 희망 상태를 지워도 알리지 않고 스냅샷도 그대로다', () => {
    const before = pickIntents.getSnapshot();
    const listener = vi.fn();
    pickIntents.subscribe(listener);

    pickIntents.clear('b1', 'p1');

    expect(listener).not.toHaveBeenCalled();
    expect(pickIntents.getSnapshot()).toBe(before);
  });

  it('같은 사진의 저장 루프는 하나만 시작할 수 있다', () => {
    expect(pickIntents.begin('b1', 'p1')).toBe(true);
    expect(pickIntents.begin('b1', 'p1')).toBe(false);
    // 다른 사진·다른 번들은 따로
    expect(pickIntents.begin('b1', 'p2')).toBe(true);
    expect(pickIntents.begin('b2', 'p1')).toBe(true);

    pickIntents.end('b1', 'p1');

    expect(pickIntents.begin('b1', 'p1')).toBe(true);
  });
});
