import { afterEach, describe, expect, it } from 'vitest';
import { readHistoryEntry, removeHistoryEntry, writeHistoryEntry } from './historyEntry';

describe('historyEntry', () => {
  afterEach(() => window.history.replaceState(null, ''));

  it('적을 때 Next가 둔 내부 값을 지우지 않고, 지울 때도 그 키만 뺀다', () => {
    window.history.replaceState({ __NA: true, __PRIVATE_NEXTJS_INTERNALS_TREE: 'tree' }, '');
    writeHistoryEntry({ pageScroll: 120 });
    expect(readHistoryEntry('pageScroll')).toBe(120);
    removeHistoryEntry('pageScroll');
    expect(window.history.state).toEqual({ __NA: true, __PRIVATE_NEXTJS_INTERNALS_TREE: 'tree' });
  });

  it('state가 비어 있어도 읽기는 undefined, 쓰기는 새 항목으로 둔다', () => {
    expect(readHistoryEntry('pageScroll')).toBeUndefined();
    removeHistoryEntry('pageScroll');
    writeHistoryEntry({ placesMember: '7' });
    expect(window.history.state).toEqual({ placesMember: '7' });
  });
});
