import { describe, expect, it } from 'vitest';
import { itemsOfPages, nextPageOf } from './pages';

describe('pages', () => {
  it('다음 쪽이 있으면 마지막 쪽 번호 + 1, 없으면 undefined', () => {
    expect(nextPageOf({ hasNext: true }, [], 2)).toBe(3);
    expect(nextPageOf({ hasNext: false }, [], 2)).toBeUndefined();
  });

  it('쪽을 이어 붙이고, 받는 사이 밀려 겹친 항목은 처음 것만 남긴다', () => {
    const pages = [{ items: [{ id: 3 }, { id: 2 }] }, { items: [{ id: 2 }, { id: 1 }] }];
    expect(itemsOfPages(pages, (item) => item.id)).toEqual([{ id: 3 }, { id: 2 }, { id: 1 }]);
  });
});
