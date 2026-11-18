import { z } from 'zod';
import { CHARACTER_TYPES, DEFAULT_PROFILE_IMAGE } from '@/shared/lib/bunchProfile';
import type { FeedComment } from '../lib/types';
import { badgeColorOf, formatCommentDate } from '../lib/comments';
import { imageOrUndefined } from './feed';

// 응답 모양은 Swagger 생성 타입 SocialCommentItem·SocialCommentPage, 표시 규칙은 명세 014~017
// 계약 미연결: 작성자 배지의 번치 ID(bunchId)는 쓰지 않아 받지 않음
export const commentItemSchema = z.object({
  id: z.number().int().positive(),
  bundleId: z.number().int().positive(),
  parentId: z.number().int().positive().nullish(),
  content: z.string(),
  deleted: z.boolean(),
  createdAt: z.string().nullish(),
  author: z.object({
    memberId: z.number().int().positive().nullish(),
    nickname: z.string(),
    imageUrl: z.string().nullish(),
  }),
  // 서버는 성격을 enum이 아닌 문자열로 줌. 모르는 값이면 회색 배지
  badge: z.object({ name: z.string(), characterType: z.string() }).nullish(),
  replyCount: z.number().int().nonnegative(),
  canDelete: z.boolean(),
  canReply: z.boolean(),
  canReport: z.boolean(),
});
export type CommentItemResponse = z.infer<typeof commentItemSchema>;

// 계약 미연결: 항목(commentItemSchema)과 같은 이유로 작성자 배지의 번치 ID를 받지 않음
export const commentPageSchema = z.object({
  items: z.array(commentItemSchema),
  nextCursor: z.string().nullish(),
  hasNext: z.boolean(),
  // 번들 전체 원댓글·답글 수(삭제 포함, 숨김 제외)
  totalCount: z.number().int().nonnegative(),
});
export type CommentPage = z.infer<typeof commentPageSchema>;

const characterTypeOf = (value: string | undefined) =>
  CHARACTER_TYPES.find((type) => type === value);

/** 화면 댓글 한 줄(삭제 자리는 서버가 「작성자」·「삭제된 댓글입니다」로 줌) */
export const toFeedComment = (item: CommentItemResponse): FeedComment => {
  const time = item.createdAt ? Date.parse(item.createdAt) : Number.NaN;
  return {
    id: String(item.id),
    author: item.author.nickname,
    // 사진이 없는 작성자는 다른 화면과 같은 기본 이미지(비우면 ProfileImage가 배경색 원만 그림)
    avatarSrc: imageOrUndefined(item.author.imageUrl) ?? DEFAULT_PROFILE_IMAGE,
    bunchName: item.badge?.name,
    bunchColor: item.badge ? badgeColorOf(characterTypeOf(item.badge.characterType)) : undefined,
    date: Number.isNaN(time) ? undefined : formatCommentDate(time),
    content: item.content,
    reply: item.parentId != null,
    parentId: item.parentId == null ? undefined : String(item.parentId),
    deleted: item.deleted,
    replyCount: item.replyCount,
    canDelete: item.canDelete,
    canReply: item.canReply,
    canReport: item.canReport,
  };
};
