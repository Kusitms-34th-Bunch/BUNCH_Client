import { describe, expect, it } from 'vitest';
import type { FeedComment } from './types';
import { badgeColorOf, formatCommentDate, hideComment } from './comments';

const perms = { canDelete: false, canReply: true, canReport: true };
const list: FeedComment[] = [
  { id: 'a', author: '수인', content: '원댓글', replyCount: 1, ...perms },
  { id: 'a-1', author: '경진', content: '답글', reply: true, parentId: 'a', ...perms },
  { id: 'b', author: '은우', content: '다른 원댓글', ...perms },
];

describe('comments', () => {
  it('번치 성격별 배지 색과 날짜 형식', () => {
    expect(badgeColorOf('TYPE_3')).toBe('pink');
    expect(badgeColorOf(undefined)).toBe('gray');
    expect(formatCommentDate(new Date(2026, 0, 5).getTime())).toBe('2026.01.05');
  });

  it('신고한 원댓글은 답글과 함께 숨기고 숨긴 수를 돌려준다', () => {
    expect(hideComment(list, 'a')).toEqual({ comments: [list[2]], hiddenCount: 2 });
    expect(hideComment(list, 'a-1').comments.map(({ id }) => id)).toEqual(['a', 'b']);
    expect(hideComment(list, 'a-1').comments[0]?.replyCount).toBe(0);
  });
});
