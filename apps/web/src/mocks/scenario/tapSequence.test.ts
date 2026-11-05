import { describe, expect, it } from 'vitest';
import { createTapSequence } from './tapSequence';

const sequence = (count = 3, gapMs = 1000) => {
  let time = 0;
  const tapper = createTapSequence({ count, gapMs, now: () => time });
  return {
    tap: (after = 100) => {
      time += after;
      return tapper.tap();
    },
  };
};

describe('createTapSequence', () => {
  it('간격 안에서 count번 이어지면 마지막 터치에서 true다', () => {
    const { tap } = sequence(3);

    expect([tap(), tap(), tap()]).toEqual([false, false, true]);
  });

  it('간격이 벌어지면 처음부터 다시 센다', () => {
    const { tap } = sequence(3, 1000);

    tap();
    tap();
    expect(tap(1500)).toBe(false);
    expect(tap()).toBe(false);
    expect(tap()).toBe(true);
  });

  it('채워진 뒤에는 처음부터 다시 센다', () => {
    const { tap } = sequence(2);

    expect([tap(), tap(), tap(), tap()]).toEqual([false, true, false, true]);
  });
});
