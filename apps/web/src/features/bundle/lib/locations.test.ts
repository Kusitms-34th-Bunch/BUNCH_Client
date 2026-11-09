import { describe, expect, it } from 'vitest';
import { moveLocation } from './locations';

const a = { id: 'a', name: '서울특별시 여의도동' };
const b = { id: 'b', name: '부산광역시 해운대구' };
const c = { id: 'c', name: '제주특별자치도 애월읍' };

describe('moveLocation', () => {
  it('위치를 앞뒤로 옮긴다', () => {
    expect(moveLocation([a, b, c], 'a', 2)).toEqual([b, c, a]);
    expect(moveLocation([a, b, c], 'c', 0)).toEqual([c, a, b]);
    expect(moveLocation([a, b, c], 'b', 1)).toEqual([a, b, c]);
  });

  it('범위를 벗어난 자리는 맨 앞이나 맨 끝으로 맞춘다', () => {
    expect(moveLocation([a, b, c], 'a', 9)).toEqual([b, c, a]);
    expect(moveLocation([a, b, c], 'c', -3)).toEqual([c, a, b]);
  });

  it('없는 위치나 같은 자리는 그대로 둔다', () => {
    const list = [a, b];
    expect(moveLocation(list, 'x', 0)).toBe(list);
    expect(moveLocation(list, 'a', 0)).toBe(list);
  });

  it('원본을 바꾸지 않는다', () => {
    const list = [a, b, c];
    moveLocation(list, 'a', 2);
    expect(list).toEqual([a, b, c]);
  });
});
