import { describe, expect, it } from 'vitest';
import type { FeedComment } from './types';
import {
  addComment,
  addReply,
  badgeColorOf,
  formatCommentDate,
  hideComment,
  markDeleted,
} from './comments';

const list: FeedComment[] = [
  { id: 'a', author: '수인', content: '원댓글', replyCount: 1 },
  { id: 'a-1', author: '경진', content: '답글', reply: true, parentId: 'a' },
  { id: 'b', author: '은우', content: '다른 원댓글' },
];

describe('comments', () => {
  it('원댓글은 맨 위, 답글은 그 원댓글의 답글 끝에 넣고 「답글 N」을 올린다', () => {
    const added = addComment(list, { id: 'c', author: '나' });
    expect(added.map(({ id }) => id)).toEqual(['c', 'a', 'a-1', 'b']);

    const replied = addReply(list, 'a', { id: 'a-2', author: '나', reply: true, parentId: 'a' });
    expect(replied.map(({ id }) => id)).toEqual(['a', 'a-1', 'a-2', 'b']);
    expect(replied[0]?.replyCount).toBe(2);
    expect(addReply(list, 'none', { id: 'x', author: '나' })).toBe(list);
  });

  it('지운 댓글은 자리를 지키고 내용을 지운다', () => {
    const deleted = markDeleted(list, 'a', '작성자');
    expect(deleted[0]).toEqual({
      id: 'a',
      author: '작성자',
      deleted: true,
      reply: undefined,
      parentId: undefined,
      replyCount: 1,
    });
    expect(deleted[1]).toBe(list[1]);
  });

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
