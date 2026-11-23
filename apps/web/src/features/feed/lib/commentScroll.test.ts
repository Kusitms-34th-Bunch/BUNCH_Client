import { describe, expect, it } from 'vitest';
import { alignDistance, alignedScrollTop, scrollRoom, viewScale } from './commentScroll';

type Box = {
  top?: number;
  height?: number;
  offsetHeight?: number;
  clientHeight?: number;
  scrollHeight?: number;
  scrollTop?: number;
};

const box = ({ top = 0, height = 0, offsetHeight = height, ...rest }: Box) => {
  const element = document.createElement('div');
  element.getBoundingClientRect = () => ({ top, height }) as DOMRect;
  for (const [key, value] of Object.entries({ offsetHeight, ...rest }))
    Object.defineProperty(element, key, { value, writable: true });
  return element;
};

describe('viewScale', () => {
  it('보이는 높이와 레이아웃 높이의 비율, 높이가 0이면 1', () => {
    expect(viewScale(box({ height: 50, offsetHeight: 100 }))).toBe(0.5);
    expect(viewScale(box({ height: 0, offsetHeight: 0 }))).toBe(1);
  });
});

describe('alignDistance', () => {
  const main = box({ top: 100, height: 600, clientHeight: 600 });

  it('맨 위 맞춤은 main 위쪽과의 거리, 가운데 맞춤은 남는 높이의 절반을 뺌', () => {
    const item = box({ top: 500, height: 200 });
    expect(alignDistance(main, item, false)).toBe(400);
    expect(alignDistance(main, item, true)).toBe(200);
  });

  it('화면보다 긴 대상은 윗부분을 맞추고, 배율만큼 되돌림', () => {
    expect(alignDistance(main, box({ top: 500, height: 900 }), true)).toBe(400);
    const scaled = box({ top: 100, height: 300, offsetHeight: 600, clientHeight: 600 });
    expect(alignDistance(scaled, box({ top: 200, height: 0 }), false)).toBe(200);
  });
});

describe('alignedScrollTop·scrollRoom', () => {
  it('갈 수 있는 끝(0과 scrollHeight - clientHeight) 안으로 맞춤', () => {
    const main = box({ height: 600, clientHeight: 600, scrollHeight: 1000, scrollTop: 100 });
    expect(alignedScrollTop(main, box({ top: 200 }), false)).toBe(300);
    expect(alignedScrollTop(main, box({ top: 900 }), false)).toBe(400);
    expect(alignedScrollTop(main, box({ top: -500 }), false)).toBe(0);
  });

  it('아래로는 남은 길이, 위로는 지금 scrollTop', () => {
    const main = box({ clientHeight: 600, scrollHeight: 1000, scrollTop: 100 });
    expect(scrollRoom(main, 10)).toBe(300);
    expect(scrollRoom(main, -10)).toBe(100);
  });
});
