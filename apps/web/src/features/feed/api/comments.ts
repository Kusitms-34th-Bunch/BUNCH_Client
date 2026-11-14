import { bffApi, requestData } from '@/shared/api/bffApi';
import { IDEMPOTENCY_KEY_HEADER } from '@/shared/api/idempotencyKey';
import { commentItemSchema, commentPageSchema, type CommentItemResponse } from '../model/comment';

const commentsPath = (bundleId: number) => `bundles/${bundleId}/comments`;
const PAGE_SIZE = 20;
const REPLY_PAGE_SIZE = 50;

/** 원댓글 한 쪽(명세 014, 최신순). 지금 번치 명의로 보이는 것만 */
export const getComments = (bundleId: number, cursor: string | undefined, signal?: AbortSignal) =>
  requestData(
    bffApi.get(commentsPath(bundleId), {
      searchParams: { size: PAGE_SIZE, ...(cursor && { cursor }) },
      signal: signal ?? null,
    }),
    commentPageSchema,
    'bundle comments',
  );

/** 원댓글 하나의 답글 전부(명세 015, 오래된 순). 원댓글 아래에 늘 펼쳐 보여 쪽을 끝까지 받음 */
export const getAllReplies = async (bundleId: number, commentId: number, signal?: AbortSignal) => {
  const replies: CommentItemResponse[] = [];
  const used = new Set<string>();
  let cursor: string | undefined;
  do {
    const page = await requestData(
      bffApi.get(`${commentsPath(bundleId)}/${commentId}/replies`, {
        searchParams: { size: REPLY_PAGE_SIZE, ...(cursor && { cursor }) },
        signal: signal ?? null,
      }),
      commentPageSchema,
      'comment replies',
    );
    replies.push(...page.items);
    if (!page.hasNext) break;
    // 다음 쪽이 있다는데 커서가 없거나 받은 커서가 다시 오면 실패로(답글이 빠진 채 끝난 것으로 보지 않게)
    if (!page.nextCursor || used.has(page.nextCursor))
      throw new Error('comment replies cursor did not advance');
    cursor = page.nextCursor;
    used.add(cursor);
  } while (cursor);
  return replies;
};

/** parentId는 원댓글이면 null(생성 타입은 생략 가능 필드지만 명세 016은 null 허용) */
export type CreateCommentInput = { content: string; parentId: number | null };

/** 지금 번치 명의로 원댓글·답글 등록(명세 016). 같은 키·내용·부모로 다시 보내면 처음 결과 */
export const createComment = (
  bundleId: number,
  input: CreateCommentInput,
  idempotencyKey: string,
) =>
  requestData(
    bffApi.post(commentsPath(bundleId), {
      json: input,
      headers: { [IDEMPOTENCY_KEY_HEADER]: idempotencyKey },
    }),
    commentItemSchema,
    'create comment',
  );

/** 내 댓글·답글 삭제(명세 017). 응답은 삭제 자리 */
export const deleteComment = (bundleId: number, commentId: number) =>
  requestData(
    bffApi.delete(`${commentsPath(bundleId)}/${commentId}`),
    commentItemSchema,
    'delete comment',
  );
