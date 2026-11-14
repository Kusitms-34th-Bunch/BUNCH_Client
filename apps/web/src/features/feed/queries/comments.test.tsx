import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
// 가짜 서버 응답에 기대므로 직접 연결(PR의 `--changed`가 handler 변경 때 이 테스트를 고르게)
import '@/mocks/server';
import { createQueryWrapper, createTestQueryClient } from '@/shared/query/testing';
import type { CommentItemResponse, CommentPage } from '../model/comment';
import { useCreateCommentMutation, useDeleteCommentMutation } from './comments';
import { feedKeys } from './keys';

// 지금 번치 1 명의로 보는 「가평 첫 캠핑」(가짜 서버 번들 901)
const VIEWER = '1';
const target = { bundleId: 901, viewerId: VIEWER };
const listKey = feedKeys.comments('901', VIEWER);
const repliesKey = feedKeys.replies('901', VIEWER, 5001);
const detailKey = feedKeys.detail('3', '901', VIEWER);
const feedKey = feedKeys.list(VIEWER);

const root = (id: number, replyCount = 0) =>
  ({ id, bundleId: 901, parentId: null, content: `댓글 ${id}`, replyCount }) as CommentItemResponse;

const setup = () => {
  const client = createTestQueryClient();
  client.setQueryData(listKey, {
    pages: [{ items: [root(5005), root(5001, 1)], hasNext: false, totalCount: 4 }],
    pageParams: [undefined],
  });
  client.setQueryData(repliesKey, [{ ...root(5002), parentId: 5001 }]);
  client.setQueryData(detailKey, { id: 901, commentCount: 4 });
  client.setQueryData(feedKey, {
    pages: [{ items: [{ type: 'BUNDLE', bundle: { id: 901, commentCount: 4 } }] }],
    pageParams: [undefined],
  });
  const wrapper = createQueryWrapper(client);
  const create = renderHook(() => useCreateCommentMutation(target), { wrapper }).result;
  const remove = renderHook(() => useDeleteCommentMutation(target), { wrapper }).result;
  return { client, create, remove };
};
const pageOf = (data: unknown) => (data as { pages: CommentPage[] }).pages[0]!;
const countOf = (client: ReturnType<typeof createTestQueryClient>) => ({
  list: pageOf(client.getQueryData(listKey)).totalCount,
  detail: (client.getQueryData(detailKey) as { commentCount: number }).commentCount,
  feed: (
    client.getQueryData(feedKey) as { pages: { items: { bundle: { commentCount: number } }[] }[] }
  ).pages[0]!.items[0]!.bundle.commentCount,
});

describe('댓글 등록·삭제 캐시', () => {
  it('원댓글은 첫 쪽 맨 위에 넣고 목록·상세·피드 카드의 수를 올린다', async () => {
    const { client, create } = setup();
    act(() =>
      create.current.mutate({
        content: '새 댓글',
        parentId: null,
        idempotencyKey: crypto.randomUUID(),
      }),
    );
    await waitFor(() => expect(create.current.isSuccess).toBe(true));

    expect(pageOf(client.getQueryData(listKey)).items[0]).toMatchObject({ content: '새 댓글' });
    expect(countOf(client)).toEqual({ list: 5, detail: 5, feed: 5 });
  });

  it('답글은 그 원댓글의 답글 끝에 넣고 「답글 N」과 수를 올린다', async () => {
    const { client, create } = setup();
    act(() =>
      create.current.mutate({
        content: '새 답글',
        parentId: 5001,
        idempotencyKey: crypto.randomUUID(),
      }),
    );
    await waitFor(() => expect(create.current.isSuccess).toBe(true));

    const replies = client.getQueryData<CommentItemResponse[]>(repliesKey)!;
    expect(replies.map((reply) => reply.content)).toEqual(['댓글 5002', '새 답글']);
    expect(pageOf(client.getQueryData(listKey)).items[1]).toMatchObject({
      id: 5001,
      replyCount: 2,
    });
    expect(countOf(client)).toEqual({ list: 5, detail: 5, feed: 5 });
  });

  it('같은 키로 다시 보내 이미 목록에 있는 댓글이 오면 넣지 않고 수도 그대로 둔다', async () => {
    const { client, create } = setup();
    const idempotencyKey = crypto.randomUUID();
    act(() => create.current.mutate({ content: '한 번', parentId: null, idempotencyKey }));
    await waitFor(() => expect(create.current.isSuccess).toBe(true));
    act(() => create.current.mutate({ content: '한 번', parentId: null, idempotencyKey }));
    await waitFor(() => expect(create.current.isIdle || create.current.isSuccess).toBe(true));
    await waitFor(() => expect(client.isMutating()).toBe(0));

    const items = pageOf(client.getQueryData(listKey)).items;
    expect(items.filter((item) => item.content === '한 번')).toHaveLength(1);
    expect(countOf(client)).toEqual({ list: 5, detail: 5, feed: 5 });
  });

  it('기존 답글을 아직 받지 못했으면 새 답글로 덮지 않고 다시 받게 둔다', async () => {
    const { client, create } = setup();
    client.removeQueries({ queryKey: repliesKey, exact: true });
    act(() =>
      create.current.mutate({
        content: '새 답글',
        parentId: 5001,
        idempotencyKey: crypto.randomUUID(),
      }),
    );
    await waitFor(() => expect(create.current.isSuccess).toBe(true));

    expect(client.getQueryData(repliesKey)).toBeUndefined();
    expect(pageOf(client.getQueryData(listKey)).items[1]).toMatchObject({ replyCount: 2 });
  });

  it('지우면 그 자리를 서버의 삭제 자리로 바꾸고 수는 그대로 둔다', async () => {
    const { client, remove } = setup();
    act(() => remove.current.mutate({ id: 5002, parentId: 5001 }));
    await waitFor(() => expect(remove.current.isSuccess).toBe(true));

    expect(client.getQueryData<CommentItemResponse[]>(repliesKey)![0]).toMatchObject({
      id: 5002,
      deleted: true,
      content: '삭제된 댓글입니다',
    });
    expect(countOf(client)).toEqual({ list: 4, detail: 4, feed: 4 });
  });
});
