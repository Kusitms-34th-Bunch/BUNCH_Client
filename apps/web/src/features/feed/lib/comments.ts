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
