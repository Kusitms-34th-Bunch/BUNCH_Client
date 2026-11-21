import { describe, expect, it } from 'vitest';
import { expectedFollowState, listVisibilityOf, withListFollow } from './followCache';

const row = (id: number, visibility: 'PUBLIC' | 'PRIVATE') => ({
  bunch: { id, name: `번치 ${id}`, characterType: 'BLUE', visibility },
  followState: 'NONE',
  followId: null,
  followedAt: '2026-11-01T00:00:00.000Z',
});
const pages = {
  pageParams: [0],
  pages: [
    {
      items: [row(3, 'PUBLIC'), row(4, 'PRIVATE')],
      page: 0,
      size: 20,
      totalElements: 2,
      hasNext: false,
    },
  ],
};

describe('followCache', () => {
  it('공개 번치는 바로 팔로잉, 비공개 번치는 요청됨으로 예상한다', () => {
    expect(expectedFollowState('PUBLIC')).toBe('FOLLOWING');
    expect(expectedFollowState('PRIVATE')).toBe('REQUESTED');
  });

  it('목록에서 그 번치 행만 바꾸고 다른 행은 그대로 둔다', () => {
    const next = withListFollow(pages, '4', 'REQUESTED') as typeof pages;

    expect(next.pages[0]!.items.map((item) => item.followState)).toEqual(['NONE', 'REQUESTED']);
    expect(next.pages[0]!.items[1]!.followId).toBeNull();
  });

  it('행에 팔로우 상태가 없는 요청 목록은 바꾸지 않는다', () => {
    const requests = {
      pageParams: [0],
      pages: [{ items: [{ id: 1, bunch: row(4, 'PRIVATE').bunch, requestedAt: '' }] }],
    };

    expect(withListFollow(requests, '4', 'FOLLOWING')).toBe(requests);
  });

  it('목록에서 그 번치의 공개 여부를 찾는다', () => {
    expect(listVisibilityOf(pages, '4')).toBe('PRIVATE');
    expect(listVisibilityOf(pages, '9')).toBeUndefined();
  });
});
