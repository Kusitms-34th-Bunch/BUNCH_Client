import { describe, expect, it } from 'vitest';
import { DEFAULT_PROFILE_IMAGE } from '@/shared/lib/profile/bunchProfile';
import { commentItemSchema, toFeedComment } from './comment';

const item = {
  id: 301,
  bundleId: 123,
  parentId: null,
  content: '즐거운 하루였어요\n또 가요',
  deleted: false,
  createdAt: '2026-11-07T10:00:00Z',
  author: { memberId: 7, nickname: '뭉치', imageUrl: null },
  badge: { bunchId: 45, name: '여행가조', characterType: 'TYPE_3' },
  replyCount: 2,
  canDelete: true,
  canReply: true,
  canReport: false,
};

describe('toFeedComment', () => {
  it('서버 댓글을 화면 한 줄로 바꾸고 권한은 그대로 두며, 사진이 없는 작성자는 기본 프로필 이미지', () => {
    expect(toFeedComment(commentItemSchema.parse(item))).toEqual({
      id: '301',
      author: '뭉치',
      memberId: '7',
      avatarSrc: DEFAULT_PROFILE_IMAGE,
      bunchName: '여행가조',
      bunchColor: 'pink',
      date: '2026.11.07',
      content: '즐거운 하루였어요\n또 가요',
      reply: false,
      parentId: undefined,
      deleted: false,
      replyCount: 2,
      canDelete: true,
      canReply: true,
      canReport: false,
    });
  });

  it('안전하지 않은 작성자 이미지 주소도 기본 프로필 이미지로 둔다', () => {
    const comment = toFeedComment(
      commentItemSchema.parse({
        ...item,
        author: { ...item.author, imageUrl: 'javascript:alert(1)' },
      }),
    );
    expect(comment.avatarSrc).toBe(DEFAULT_PROFILE_IMAGE);
  });

  it('답글은 원댓글 ID, 삭제 자리는 날짜·배지 없음, 모르는 성격은 회색', () => {
    const reply = toFeedComment(
      commentItemSchema.parse({
        ...item,
        parentId: 300,
        badge: { ...item.badge, characterType: 'TYPE_9' },
      }),
    );
    expect(reply).toMatchObject({ reply: true, parentId: '300', bunchColor: 'gray' });
    const deleted = toFeedComment(
      commentItemSchema.parse({ ...item, deleted: true, createdAt: null, badge: null }),
    );
    expect(deleted).toMatchObject({ deleted: true, date: undefined, bunchName: undefined });
  });
});
