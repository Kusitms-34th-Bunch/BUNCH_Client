import {
  type InfiniteData,
  infiniteQueryOptions,
  queryOptions,
  skipToken,
  type QueryClient,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import { useCallback } from 'react';
import { isWireId, toDomainId } from '@/shared/api/client/ids';
import type { BundleDetailResponse } from '../model/bundleDetail';
import type { CommentItemResponse, CommentPage } from '../model/comment';
import type { FeedPage } from '../model/feed';
import { createComment, deleteComment, getAllReplies, getComments } from '../api/comments';
import { feedKeys } from './keys';

/** 원댓글을 쪽 단위로(최신순). 명의를 알기 전(undefined)이나 잘못된 번들 ID면 요청하지 않고, 들어올 때마다 최신으로(6.2.1 로직 3) */
export const commentsQueryOptions = (bundleId: string, viewerId: string | null | undefined) =>
  infiniteQueryOptions({
    queryKey: feedKeys.comments(bundleId, viewerId ?? null),
    initialPageParam: undefined as string | undefined,
    queryFn:
      viewerId === undefined || !isWireId(bundleId)
        ? skipToken
        : ({ pageParam, signal }) => getComments(bundleId, pageParam, signal),
    refetchOnMount: 'always',
    // 같은 cursor가 다시 오면 무한 반복하지 않고 거기서 끝냄
    getNextPageParam: (lastPage, _pages, _lastParam, allParams) =>
      lastPage.hasNext && lastPage.nextCursor && !allParams.includes(lastPage.nextCursor)
        ? lastPage.nextCursor
        : undefined,
  });

/** 다른 화면에서 들어오기 전에 원댓글 첫 쪽을 미리 받음(말풍선 진입이 처음부터 댓글 위치에 서도록) */
export const usePrefetchComments = () => {
  const queryClient = useQueryClient();
  return (bundleId: string, viewerId: string | null) =>
    queryClient.prefetchInfiniteQuery(commentsQueryOptions(bundleId, viewerId));
};

/** 원댓글 하나의 답글 전부(오래된 순) */
export const repliesQueryOptions = (bundleId: string, viewerId: string | null, parentId: number) =>
  queryOptions({
    queryKey: feedKeys.replies(bundleId, viewerId, toDomainId(parentId)),
    queryFn: ({ signal }) => getAllReplies(bundleId, parentId, signal),
    refetchOnMount: 'always',
  });

type Target = { bundleId: string; viewerId: string | null };

const patchRoots = (
  client: QueryClient,
  { bundleId, viewerId }: Target,
  next: (_page: CommentPage, _index: number) => CommentPage,
) =>
  client.setQueryData<InfiniteData<CommentPage>>(feedKeys.comments(bundleId, viewerId), (data) =>
    data ? { ...data, pages: data.pages.map(next) } : data,
  );

/** 피드 카드·상세·목록의 댓글 수를 하나 올림(다시 받지 않고, 피드는 쪽 전부를 다시 받지 않게) */
const addCount = (client: QueryClient, target: Target) => {
  const { bundleId, viewerId } = target;
  patchRoots(client, target, (page) => ({ ...page, totalCount: page.totalCount + 1 }));
  client.setQueriesData<InfiniteData<FeedPage>>(
    { queryKey: feedKeys.list(viewerId), exact: true },
    (data) =>
      data && {
        ...data,
        pages: data.pages.map((page) => ({
          ...page,
          items: page.items.map((item) =>
            'bundle' in item && toDomainId(item.bundle.id) === bundleId
              ? { ...item, bundle: { ...item.bundle, commentCount: item.bundle.commentCount + 1 } }
              : item,
          ),
        })),
      },
  );
  client.setQueriesData<BundleDetailResponse>(
    { queryKey: feedKeys.details(bundleId, viewerId) },
    (data) => data && { ...data, commentCount: data.commentCount + 1 },
  );
};

// 진행 중인 받기를 멈춤. 아직 데이터가 없는 첫 받기는 멈추면 받는 중에 머무르므로 그대로 둠
const cancelLoaded = (client: QueryClient, keys: readonly (readonly unknown[])[]) =>
  Promise.all(
    keys
      .filter((key) => client.getQueryData(key) !== undefined)
      .map((key) => client.cancelQueries({ queryKey: key, exact: true })),
  );

const replaceItem = (items: CommentItemResponse[], saved: CommentItemResponse) =>
  items.map((item) => (item.id === saved.id ? saved : item));

// 대상은 요청할 때 값으로 넘김(진행 중 명의가 바뀌어 다시 렌더돼도 응답을 보낸 명의의 cache에 넣게)
type CreateVariables = {
  target: Target;
  content: string;
  parentId: string | null;
  idempotencyKey: string;
};

/**
 * 지금 번치 명의로 댓글·답글 등록(명세 016). 성공하면 원댓글은 맨 위, 답글은 그 원댓글의 답글 끝에 넣고 수를 올림
 * 서버 응답을 기다린 뒤 넣음(작성자·배지·시각은 서버 값). 실패 안내는 화면이 오류 코드로 나눔
 */
export const useCreateCommentMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ target, content, parentId, idempotencyKey }: CreateVariables) =>
      createComment(target.bundleId, { content, parentId }, idempotencyKey),
    onSuccess: async (saved, { target }) => {
      const listKey = feedKeys.comments(target.bundleId, target.viewerId);
      const parentId = saved.parentId;
      const repliesKey =
        parentId == null
          ? undefined
          : feedKeys.replies(target.bundleId, target.viewerId, toDomainId(parentId));
      // 진행 중인 다시 받기가 늦게 끝나 넣은 댓글·답글 수를 덮지 않게 먼저 멈춤(답글이면 원댓글 목록도)
      await cancelLoaded(queryClient, repliesKey ? [repliesKey, listKey] : [listKey]);
      const roots = queryClient.getQueryData<InfiniteData<CommentPage>>(listKey);
      const replies = repliesKey && queryClient.getQueryData<CommentItemResponse[]>(repliesKey);
      // 같은 키로 다시 보내 처음 결과가 왔는데 이미 목록에 있으면(연타·재시도) 바꾸기만 하고 수는 그대로
      const known =
        roots?.pages.some((page) => page.items.some((item) => item.id === saved.id)) ||
        replies?.some((item) => item.id === saved.id);
      if (known) {
        if (repliesKey) {
          queryClient.setQueryData<CommentItemResponse[]>(
            repliesKey,
            (list) => list && replaceItem(list, saved),
          );
        } else {
          patchRoots(queryClient, target, (page) => ({
            ...page,
            items: replaceItem(page.items, saved),
          }));
        }
        return;
      }
      if (!repliesKey) {
        patchRoots(queryClient, target, (page, index) =>
          index === 0 ? { ...page, items: [saved, ...page.items] } : page,
        );
      } else {
        const parent = roots?.pages
          .flatMap((page) => page.items)
          .find((item) => item.id === parentId);
        // 첫 답글이면 새로 만들고, 기존 답글을 아직 받지 못했으면 덮지 않고 다시 받게 둠
        if (replies || parent?.replyCount === 0) {
          queryClient.setQueryData<CommentItemResponse[]>(repliesKey, [...(replies ?? []), saved]);
        } else {
          void queryClient.invalidateQueries({ queryKey: repliesKey, exact: true });
        }
        patchRoots(queryClient, target, (page) => ({
          ...page,
          items: page.items.map((item) =>
            item.id === parentId ? { ...item, replyCount: item.replyCount + 1 } : item,
          ),
        }));
      }
      addCount(queryClient, target);
    },
  });
};

/** 내 댓글·답글 삭제(명세 017). 성공하면 그 자리를 서버의 삭제 자리로 바꿈(수는 그대로) */
export const useDeleteCommentMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (comment: { target: Target; id: string; parentId: string | null }) =>
      deleteComment(comment.target.bundleId, comment.id),
    // 자리는 지운 댓글의 원래 위치로 찾음(삭제 자리 응답의 parentId에 기대지 않음)
    onSuccess: async (saved, { target, parentId }) => {
      await cancelLoaded(queryClient, [
        parentId == null
          ? feedKeys.comments(target.bundleId, target.viewerId)
          : feedKeys.replies(target.bundleId, target.viewerId, parentId),
      ]);
      if (parentId == null) {
        patchRoots(queryClient, target, (page) => ({
          ...page,
          items: replaceItem(page.items, saved),
        }));
        return;
      }
      queryClient.setQueryData<CommentItemResponse[]>(
        feedKeys.replies(target.bundleId, target.viewerId, parentId),
        (replies) => replies && replaceItem(replies, saved),
      );
    },
  });
};

/** 목록을 처음부터 다시 받기(받은 쪽을 버림). 커서를 이어 쓸 수 없거나 그사이 바뀐 것을 맞출 때 */
export const useRestartComments = ({ bundleId, viewerId }: Target) => {
  const queryClient = useQueryClient();
  return useCallback(
    () => queryClient.resetQueries({ queryKey: feedKeys.comments(bundleId, viewerId) }),
    [queryClient, bundleId, viewerId],
  );
};
