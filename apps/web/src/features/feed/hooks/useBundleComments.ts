import { isApiError } from '@app/api-core';
import { useInfiniteQuery, useQueries } from '@tanstack/react-query';
import { useCallback, useEffect, useRef, useState } from 'react';
import { createIdempotencyKey } from '@/shared/api/idempotencyKey';
import { toWireId } from '@/shared/api/ids';
import type { FeedComment } from '../lib/types';
import { hideComment } from '../lib/comments';
import { type CommentItemResponse, toFeedComment } from '../model/comment';
import {
  commentsQueryOptions,
  repliesQueryOptions,
  useCreateCommentMutation,
  useDeleteCommentMutation,
  useRestartComments,
} from '../queries/comments';

type CreateCallbacks = {
  onSuccess: (_saved: CommentItemResponse) => void;
  onError: (_error: unknown) => void;
};

/**
 * 번들 상세의 댓글(명세 014~017): 원댓글을 쪽 단위로 받고, 답글이 있는 원댓글마다 답글을 받아 원댓글 아래에 펼침
 * 신고한 댓글은 화면에서만 숨김(신고 서버 반영은 API 연동 5번). 목록 끝이 보이면 다음 쪽, 실패하면 다시 내려올 때 다시 시도
 */
export function useBundleComments(
  bundleId: string,
  viewerId: string | null | undefined,
  /** 커서를 이어 쓸 수 없을 때(400, 다른 기기에서 번치 전환 등) 명의도 다시 받게 화면이 넘김 */
  onStaleCursor: () => void,
) {
  const wireId = toWireId(bundleId);
  const target = { bundleId: wireId ?? 0, viewerId: viewerId ?? null };
  const list = useInfiniteQuery(
    commentsQueryOptions(target.bundleId, wireId === undefined ? undefined : viewerId),
  );

  // 이어 받는 사이 새 댓글이 앞에 붙으면 쪽 경계가 밀려 같은 댓글이 다시 올 수 있어 한 번만
  const seen = new Set<number>();
  const roots = (list.data?.pages ?? [])
    .flatMap((page) => page.items)
    .filter((item) => !seen.has(item.id) && seen.add(item.id));
  const parents = roots.filter((root) => root.replyCount > 0);
  const replies = useQueries({
    queries: parents.map((root) => ({
      ...repliesQueryOptions(target.bundleId, target.viewerId, root.id),
      enabled: viewerId !== undefined,
    })),
  });
  // ponytail: 답글을 받지 못하면 원댓글만 보임, 다음 진입 때 다시 받음
  const repliesOf = new Map(parents.map((root, index) => [root.id, replies[index]?.data ?? []]));

  const [hiddenIds, setHiddenIds] = useState<readonly string[]>([]);
  let comments: readonly FeedComment[] = roots
    .flatMap((root) => [root, ...(repliesOf.get(root.id) ?? [])])
    .map(toFeedComment);
  let hiddenCount = 0;
  for (const id of hiddenIds) {
    const result = hideComment(comments, id);
    comments = result.comments;
    hiddenCount += result.hiddenCount;
  }

  // 커서를 이어 쓸 수 없으면(번치 전환 등, 400) 처음부터 한 번 다시 받음. 다음 쪽을 받아야 다시 허용
  const restarted = useRef(false);
  const { fetchNextPage } = list;
  const restart = useRestartComments(target);
  // 다음 쪽 실패는 다시 받는 동안에도 남겨 「다시 시도」 버튼이 사라지지 않게 함(누른 버튼의 초점 유지)
  // 연달아 실패한 횟수(실패할 때마다 안내를 새로 그려 다시 읽히게, 성공·처음부터 다시 받기면 0)
  const [moreFailures, setMoreFailures] = useState(0);
  const loadMore = useCallback(async () => {
    const result = await fetchNextPage();
    setMoreFailures((count) => (result.isFetchNextPageError ? count + 1 : 0));
    if (!result.isFetchNextPageError) {
      restarted.current = false;
      return;
    }
    if (isApiError(result.error) && result.error.status === 400 && !restarted.current) {
      restarted.current = true;
      setMoreFailures(0);
      void restart();
      onStaleCursor();
    }
  }, [fetchNextPage, restart, onStaleCursor]);

  // 목록 끝 감지 요소는 상세 본문이 그려진 뒤에 생겨 callback ref로 받음(목록이 상세보다 먼저 와도 관찰이 붙게)
  const [moreElement, moreRef] = useState<HTMLDivElement | null>(null);
  const canLoadMore = list.hasNextPage && !list.isFetchingNextPage;
  const moreFailed = moreFailures > 0;
  useEffect(() => {
    const element = moreElement;
    if (!canLoadMore || !element || typeof IntersectionObserver === 'undefined') return;
    // 실패한 뒤에는 목록 끝이 화면 밖으로 나갔다 다시 보일 때만 다시 시도(보이는 채로 되풀이하지 않게)
    let armed = !moreFailed;
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry?.isIntersecting) {
        armed = true;
        return;
      }
      if (!armed) return;
      armed = false;
      void loadMore();
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [moreElement, canLoadMore, moreFailed, loadMore]);

  const createMutation = useCreateCommentMutation();
  const deleteMutation = useDeleteCommentMutation();
  // 같은 명의·내용·대상으로 다시 보내면 같은 키(응답이 오지 않은 요청이 두 번 등록되지 않게)
  const attempt = useRef<{ request: string; key: string } | null>(null);
  // 보내는 중 다시 누르기는 ref로 막음(isPending은 다음 렌더부터라 같은 순간의 두 번째 탭이 지나감)
  const sending = useRef(false);
  const create = (content: string, parentId: string | null, callbacks: CreateCallbacks) => {
    if (sending.current) return;
    sending.current = true;
    const parent = parentId === null ? null : (toWireId(parentId) ?? null);
    const request = JSON.stringify([target.bundleId, target.viewerId, content, parent]);
    if (attempt.current?.request !== request) {
      attempt.current = { request, key: createIdempotencyKey() };
    }
    createMutation.mutate(
      { target, content, parentId: parent, idempotencyKey: attempt.current.key },
      {
        onSettled: () => {
          sending.current = false;
        },
        onSuccess: (saved) => {
          attempt.current = null;
          callbacks.onSuccess(saved);
        },
        onError: (error) => {
          // 같은 키에 다른 본문이 기록됨(REQUEST_001)이면 새 키로
          if (isApiError(error) && error.code === 'REQUEST_001') attempt.current = null;
          callbacks.onError(error);
        },
      },
    );
  };

  const removing = useRef(false);
  const remove = (comment: FeedComment, callbacks: CreateCallbacks) => {
    const id = toWireId(comment.id);
    if (id === undefined || removing.current) return;
    removing.current = true;
    deleteMutation.mutate(
      { target, id, parentId: comment.parentId ? (toWireId(comment.parentId) ?? null) : null },
      {
        ...callbacks,
        onSettled: () => {
          removing.current = false;
        },
      },
    );
  };

  return {
    comments,
    /** 번들 전체 댓글·답글 수(서버, 받기 전 undefined). 화면에서 숨긴 수는 빼지 않음 */
    totalCount: list.data?.pages[0]?.totalCount,
    hiddenCount,
    hide: (commentId: string) => setHiddenIds((ids) => [...ids, commentId]),
    loading: list.isPending,
    failed: list.isError && !list.data,
    /** 목록 받기 오류(번들을 볼 수 없게 됐는지 화면이 판단) */
    error: list.error,
    retry: () => void list.refetch(),
    fetchingMore: list.isFetchingNextPage,
    /** 다음 쪽을 받지 못함(보이던 댓글은 그대로) */
    moreFailed,
    moreFailures,
    loadMore: () => void loadMore(),
    moreRef,
    create,
    remove,
    /** 그사이 바뀐 목록을 처음부터 다시 받음(답글 대상이 지워짐, 이미 지운 댓글) */
    restart: () => {
      setMoreFailures(0);
      void restart();
    },
  };
}
