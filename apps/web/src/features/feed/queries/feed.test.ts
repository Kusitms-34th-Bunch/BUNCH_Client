import { describe, expect, it } from 'vitest';
import { feedQueryOptions } from './feed';

describe('feedQueryOptions', () => {
  it('앱을 다시 열 때 보이도록 첫 쪽만 저장하는 표시를 단다', () => {
    expect(feedQueryOptions('1').meta).toEqual({ persist: true, persistFirstPageOnly: true });
  });
});
