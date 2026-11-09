import type { CharacterType } from '@/shared/lib/bunchProfile';
import type { FeedComment } from './types';

/** 번치 성격별 배지 색(번치 메인 배경과 같은 계열) */
const BADGE_COLORS: Record<CharacterType, NonNullable<FeedComment['bunchColor']>> = {
  TYPE_1: 'brand',
  TYPE_2: 'orange',
  TYPE_3: 'pink',
  TYPE_4: 'green',
};

export const badgeColorOf = (type: CharacterType | undefined) =>
  type ? BADGE_COLORS[type] : 'gray';

/** 「YYYY.MM.DD」 */
export const formatCommentDate = (time: number) => {
  const date = new Date(time);
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}.${pad(date.getMonth() + 1)}.${pad(date.getDate())}`;
};

/** 원댓글은 맨 위(최신순) */
export const addComment = (comments: readonly FeedComment[], comment: FeedComment) => [
  comment,
  ...comments,
];

/** 답글은 원댓글의 답글 끝(오래된 순)에 넣고 「답글 N」을 올림. 원댓글이 없으면 그대로 */
export const addReply = (
  comments: readonly FeedComment[],
  parentId: string,
  reply: FeedComment,
) => {
  const index = comments.findIndex(({ id }) => id === parentId);
  const parent = comments[index];
  if (!parent) return comments;
  let end = index + 1;
  while (comments[end]?.parentId === parentId) end += 1;
  const next = [...comments];
  next[index] = { ...parent, replyCount: (parent.replyCount ?? 0) + 1 };
  next.splice(end, 0, reply);
  return next;
};

/** 신고한 댓글은 바로 숨김. 원댓글이면 아래 답글도, 답글이면 원댓글의 「답글 N」에서도 뺌(차단과 같은 규칙). 숨긴 수와 함께 돌려줌 */
export const hideComment = (comments: readonly FeedComment[], commentId: string) => {
  const parentId = comments.find(({ id }) => id === commentId)?.parentId;
  const next = comments
    .filter(({ id, parentId: parent }) => id !== commentId && parent !== commentId)
    .map((comment) =>
      comment.id === parentId
        ? { ...comment, replyCount: Math.max(0, (comment.replyCount ?? 0) - 1) }
        : comment,
    );
  return { comments: next, hiddenCount: comments.length - next.length };
};

/** 지운 댓글은 목록에 남기고 내용·배지·날짜를 지움(답글과 「답글 N」의 수는 그대로) */
export const markDeleted = (comments: readonly FeedComment[], commentId: string, author: string) =>
  comments.map((comment) =>
    comment.id === commentId
      ? {
          id: comment.id,
          author,
          deleted: true,
          reply: comment.reply,
          parentId: comment.parentId,
          replyCount: comment.replyCount,
        }
      : comment,
  );
